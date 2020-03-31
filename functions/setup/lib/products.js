// NodeJS Built-Ins:
const { Writable } = require("stream");
const { createGunzip } = require("zlib"); 

// External Dependencies:
const AWS = require("aws-sdk");
const CsvParse = require("csv-parse");
const split = require("split");

const s3Client = new AWS.S3();

/**
 * Writable object stream implementation to upload objects to DynamoDB
 */
class DynamoDBWriter extends Writable {
  /**
   * @param {Object} opts Extends & amends opts of NodeJS stream.Writable as follows
   * @param {number} opts.batchSize=25 Number of records that should be written to DDB at a time
   * @param {boolean} opts.objectMode=true Forced=true as required for this type of stream
   * @param {Object} opts.propDefaults={} Default `key` to `val` on each object (after map) - see details
   * @param {Object} opts.propMap={} Rename `key` to `val` on each object if only `key` is defined
   * @param {string} opts.tableName=DynamoDB table name
   * 
   * propDefaults are applied after propMap, **when the property value is falsy and not === 0 or false**.
   * This includes missing, undefined, null, and ""... and was the best for our use case (as csv-parse
   * produces "" for quoted empty fields), but appreciate that it's a weird design choice.
   */
  constructor(opts) {
    opts = opts || {};
    opts.objectMode = true;
    super(opts);

    this.batchSize = opts.batchSize || 25;
    this.propDefaults = opts.propDefaults || {};
    this.propMap = opts.propMap || {};
    if (!opts.tableName) throw new Error("opts.tableName (target table) is mandatory");
    this.tableName = opts.tableName;

    this._docClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
    this._writeBuffer = [];

    // Track a total number of items written to DynamoDB:
    this.itemsWritten = 0;
    // ...And a dictionary from default property IDs to number of entries with value missing:
    this.missingValues = Object.keys(this.propDefaults).reduce(
      (acc, next) => {
        acc[next] = 0;
        return acc;
      },
      {}
    );
  }

  /**
   * Standardize item structure (whatever source it might have come from) and write it to DynamoDB
   * @param {Object} chunk 
   * @param {string} _ Encoding (standard for writable stream) is not used in object-mode streams
   * @param {function} callback To be called when chunk processing is complete
   */
  _write(chunk, _, callback) {
    // Map property names to standardized equivalents:
    for (let oldKey in this.propMap) {
      const newKey = this.propMap[oldKey];
      if (oldKey in chunk && !(newKey in chunk)) {
        chunk[newKey] = chunk[oldKey];
        delete chunk[oldKey];
      }
    }

    // Fill in default values:
    for (let key in this.propDefaults) {
      // (See constructor docstring regarding this exact condition)
      if (!chunk[key] && (chunk[key] !== 0) && (chunk[key] !== false)) {
        ++this.missingValues[key];
        const defaultVal = this.propDefaults[key];
        if (defaultVal !== undefined) chunk[key] = defaultVal;
      }
    }

    this._writeBuffer.push({ PutRequest: { Item: chunk } })
    
    const bufferLen = this._writeBuffer.length;
    if (bufferLen >= this.batchSize) {
      const writeParams = {
        RequestItems: {
          [this.tableName]: this._writeBuffer,
        },
      };
      // Synchronously clear the writeBuffer, before starting our upload:
      // (Not that any other requests should be coming through until we callback)
      this._writeBuffer = [];

      return this._docClient.batchWrite(writeParams).promise()
        .then(() => {
          this.itemsWritten += bufferLen;
          callback();
        })
        .catch((err) => {
          console.error("Error in DynamoDB write", err);
          console.error("Write request:", writeParams);
          callback(err || new Error("Unknown error in DynamoDB write"));
        });
    } else {
      callback();
    }
  }
}

/**
 * Create a chain of transform streams that transform raw file bytes into one object per record.
 * @param {string} source URI of the data file
 * @returns {{ compressed: boolean, fileType: string, streams: Array<stream.Transform>}}
 * 
 * Supports .csv with header row, or newline-delimited .json... Either with optional .gz suffix for
 * compression.
 * 
 * Pipe your raw file input to the first element of `streams`, and pipe the last element into your sink.
 */
function getParseChain(source) {
  const ixLastDot = source.lastIndexOf(".");
  if (ixLastDot < 0) throw new Error("source filename has no file extension to infer file type");

  const ext = source.substring(ixLastDot + 1).toLowerCase();
  const compressed = ext === "gz";

  let fileType;
  const streams = [];
  if (compressed) {
    // (The following won't throw errors even if ixLastDot was -1:)
    const ixSecondDot = source.substring(0, ixLastDot).lastIndexOf(".");
    fileType = source.substring(ixSecondDot + 1, ixLastDot).toLowerCase();
    streams.push(createGunzip());
  } else {
    fileType = ext;
  }

  switch (fileType) {
    case "csv":
      // columns=true produces objects instead of the default (arrays)
      streams.push(CsvParse({ columns: true }));
      break;
    case "json":
      // `split` usually just splits a stream by newlines, but can transform each line too:
      // We need to ignore any empty lines to prevent errors
      streams.push(split(
        (input) => (input ? JSON.parse(input) : null)
      ));
      break;
    default:
      throw new Error(`No parser implemented for file type '.${fileType}'`);
  }

  // Connect the stages up (if there are more than one):
  streams.forEach((s, i) => {
    if ((streams.length - i) > 1) {
      s.pipe(streams[i + 1]);
    }
  });

  return {
    compressed,
    fileType,
    streams,
  };
}

/**
 * Stream product data from S3 source file into this stack's DynamoDB items table
 * @param {string} source s3:// URI of an item data file
 * @param {string} ddbTableName DynamoDB table name to send data to
 * @returns {Promise<void>} resolving on completion
 */
function loadProducts(source, ddbTableName) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`source must be an s3:// URI - got '${source}'`);
  }

  const [srcBucket, srcKey] = source.slice("s3://".length).split(/\/(.*)/);
  return new Promise((resolve, reject) => {
    try {
      let failed = false;
      console.log(`Setting up stream from ${source}...`);
      writer = new DynamoDBWriter({
        batchSize: parseInt(process.env.DYNAMODB_WRITE_BATCH_SIZE) || 25,
        tableName: ddbTableName,
        propDefaults: {
          "asin": undefined,  // (Just count for logs, don't set)
          "genre": "no genre",
          "imUrl": "no imUrl",
          "title": "no title",
        },
        propMap: {
          // For our CSV file:
          "ITEM_ID": "asin",
          "TITLE": "title",
          "IMGURL": "imUrl",
          "GENRE": "genre",
        },
      });

      writer.on("finish", () => {
        console.log(`Wrote ${writer.itemsWritten} items to DynamoDB`);
        console.log("Missing value counts:", writer.missingValues);
        if (!failed) resolve(writer.itemsWritten);
      });

      writer.on("error", (err) => {
        console.error("Error in DynamoDB upload: ", err);
        if (!failed) reject(err);
        failed = true;
      });

      const { fileType, streams: parseStreams } = getParseChain(source);

      // Add error monitoring to every stage of the chain:
      parseStreams.forEach((s, i) => {
        s.on("error", (err) => {
          console.error(`Error in ${fileType} parser stage ${i + 1}/${parseStreams.length}: `, err);
          if (!failed) reject(err);
          failed = true;
        });
      });

      const reader = s3Client
        .getObject({
          Bucket: srcBucket,
          Key: srcKey,
        })
        .createReadStream();

      reader.on("error", (err) => {
        console.error("Error in S3 stream: ", err);
        if (!failed) reject(err);
        failed = true;
      });

      // Connect the chain together (downstream first):
      parseStreams[parseStreams.length - 1].pipe(writer);
      reader.pipe(parseStreams[0]);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  loadProducts,
};
