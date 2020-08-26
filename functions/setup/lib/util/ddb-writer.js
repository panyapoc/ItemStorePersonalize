// NodeJS Built-Ins:
const { Writable } = require("stream");

// External Dependencies:
const AWS = require("aws-sdk");

/**
 * Writable object stream implementation to upload objects to DynamoDB
 * 
 * Includes a few utilities for transforming objects on the way through.
 */
module.exports = class DynamoDBWriter extends Writable {
  /**
   * @param {Object} opts Extends & amends opts of NodeJS stream.Writable as follows
   * @param {number} opts.batchSize=25 Number of records that should be written to DDB at a time
   * @param {boolean} opts.objectMode=true Forced=true as required for this type of stream
   * @param {number} opts.progressGranularity=500 Print logs when you've uploaded >=N items since last
   * @param {Object} opts.propDefaults={} Default `key` to `val` on each object (after map) - see details
   * @param {string} opts.tableName=DynamoDB table name
   * @param {(Object) => Object} opts.transform= Optional transformation function to apply to each object
   * 
   * propDefaults are applied after transform, **when the property value is falsy and not === 0 or false**.
   * This includes missing, undefined, null, and ""... and was the best for our use case (as csv-parse
   * produces "" for quoted empty fields), but appreciate that it's a weird design choice.
   */
  constructor(opts) {
    opts = opts || {};
    opts.objectMode = true;
    super(opts);

    this.batchSize = opts.batchSize || 25;
    this.progressGranularity = opts.progressGranularity === 0 ? 0 : (opts.progressGranularity || 500);
    this.propDefaults = opts.propDefaults || {};
    if (!opts.tableName) throw new Error("opts.tableName (target table) is mandatory");
    this.tableName = opts.tableName;
    this.transformFn = opts.transform || ((item) => (item));

    this._docClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
    this._reqBuffer = [];

    // Track a total number of items written to DynamoDB:
    this.itemsWritten = 0;
    this._itemsWrittenSinceLog = 0;
    // ...And a dictionary from default property IDs to number of entries with value missing:
    this.missingValues = Object.keys(this.propDefaults).reduce(
      (acc, next) => {
        acc[next] = 0;
        return acc;
      },
      {}
    );
  }

  _flushToDDB(callback) {
    const bufferLen = this._reqBuffer.length;
    if (!bufferLen) return callback();

    // Synchronously clear the writeBuffer, before starting our upload:
    // (Not that any other requests should be coming through until we callback)
    const writeParams = {
      RequestItems: {
        [this.tableName]: this._reqBuffer,
      },
    };
    this._reqBuffer = [];

    this._docClient.batchWrite(writeParams).promise()
      .then(() => {
        this.itemsWritten += bufferLen;
        this._itemsWrittenSinceLog += bufferLen;
        if (this._itemsWrittenSinceLog >= this.progressGranularity) {
          // (Nobody likes scrolling through logs for days)
          console.log(
            `Wrote ${
              this._itemsWrittenSinceLog
            } records to DynamoDB (${
              this.itemsWritten
            } total)`
          );
          this._itemsWrittenSinceLog = 0;
        }
        callback();
      })
      .catch((err) => {
        console.error(`Error in DynamoDB write`, err);
        console.error(`Write request:`, writeParams);
        callback(err || new Error("Unknown error in DynamoDB write"));
      });
  }

  /**
   * Standardize item structure (whatever source it might have come from) and write it to DynamoDB
   * @param {Object} chunk 
   * @param {string} _ Encoding (standard for writable stream) is not used in object-mode streams
   * @param {function} callback To be called when chunk processing is complete
   */
  _write(chunk, _, callback) {
    // User transform first:
    chunk = this.transformFn(chunk);

    // Fill in default values:
    for (let key in this.propDefaults) {
      // (See constructor docstring regarding this exact condition)
      if (!chunk[key] && (chunk[key] !== 0) && (chunk[key] !== false)) {
        ++this.missingValues[key];
        const defaultVal = this.propDefaults[key];
        if (defaultVal !== undefined) chunk[key] = defaultVal;
      }
    }

    this._reqBuffer.push({ PutRequest: { Item: chunk } })
    if (this._reqBuffer.length >= this.batchSize) {
      this._flushToDDB(callback);
    } else {
      callback();
    }
  }

  _final(callback) {
    this._flushToDDB(callback);
  }
}
