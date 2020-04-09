/**
 * Custom Resource Lambda for loading product CSV/JSON into DynamoDB
 */

// NodeJS Built-Ins:
const { Transform, Writable } = require("stream");
const { createGunzip } = require("zlib"); 

// External Dependencies:
const AWS = require("aws-sdk");
const response = require("cfn-response");
const CsvParse = require("csv-parse");
const split = require("split");

// Local Dependencies:
const { timeOutNativePromise } = require("../util/promises");

const lambdaClient = new AWS.Lambda({
  httpOptions: {
    // Our lambda doesn't report any incremental results, so we need same 15min timeout when invoking:
    timeout: 1000 * 15 * 60,
  }
});
const s3Client = new AWS.S3();
const RESTYPE = "PRODUCTS";

/**
 * Transform function to standardize and sanitize a product for DDB
 * @param {Object} item Raw product object (from CSV or JSON)
 * @returns {Object} DDB-ready product (modified in-place)
 */
function productDynamoDbTransform(item) {
  // Map property names to standardized equivalents:
  const propMap = {
    // For our CSV file:
    "ITEM_ID": "asin",
    "TITLE": "title",
    "IMGURL": "imUrl",
    "GENRE": "genre",
  };
  for (let oldKey in propMap) {
    const newKey = propMap[oldKey];
    if (oldKey in item && !(newKey in item)) {
      item[newKey] = item[oldKey];
      delete item[oldKey];
    }
  }

  // Remove disallowed key to keep safely under DynamoDB size limits:
  ["also_buy", "also_viewed", "salesRank", "similar_item"].forEach(key => (delete item[key]));

  // Weed out corrupted titles (= JavaScript/HTML rubbish crawled by mistake):
  const TITLE_LEN_THRESH = 200;
  if (item.title && item.title.length > TITLE_LEN_THRESH) {
    console.warn(`[${RESTYPE}] Item ID ${item.asin} has long title (${item.title.length} chars)`);
    if (item.description && item.description.length) {
      // Hopefully we can take a substitute from the start of the description:
      const description = Array.isArray(item.description) ? item.description[0] : item.description;
      if (description.length <= TITLE_LEN_THRESH) {
        item.title = description;
      } else {
        // Might be faster than .split() (which processes all matches):
        const firstSentEnd = /[\.!?]/.exec(description);
        const firstSentence = firstSentEnd ? description.substring(0, firstSentEnd) : description;
        if (firstSentence.length <= TITLE_LEN_THRESH) {
          item.title = firstSentence;
        } else {
          item.title = firstSentence.substring(0, TITLE_LEN_THRESH - 3) + "...";
        }
      }
    } else {
      // Oh well... I guess at least try to normalize the title:
      const firstSentEnd = /[\.!?]/.exec(item.title);
      const firstSentence = firstSentEnd ? item.title.substring(0, firstSentEnd) : item.title;
      if (firstSentence.length <= TITLE_LEN_THRESH) {
        item.title = firstSentence;
      } else {
        item.title = "Untitled Product";
      }
    }
  }

  // Set up item images:
  if (item.image && !item.imUrl) {
    const candidate = Array.isArray(item.image) ? item.image[0] : item.image
    if (typeof candidate === "string") {
      // If the URL looks like it's been thumbnailed, remove the ._******_. part.
      // This RegEx captures everything *except* the part we want to chop out in groups:
      const reMatch = /^(.*images-\w+\.ssl-images-amazon.com\/.*\.)(?:_.*_.)(jpg|png)$/.exec(candidate);
      if (reMatch) {
        // ...So if it matches, we can just smush the groups back together into a non-thumbnail URL:
        // (A RegExp match is an array-like object with element 0 = the entire match, and subsequent elements
        // = each captured group. It doesn't have its own slice method, but Array's works on it just fine)
        item.imUrl = Array.prototype.slice.apply(reMatch, [1]).join("");
      } else {
        // Some other kind of image URL - leave it alone
        item.imUrl = candidate;
      }
    } else {
      // No idea what this would be
      console.warn(`[${RESTYPE}] Item ID ${item.asin} has weird 'image' value type: ignoring`);
    }
  }

  return item;
}

/**
 * Object transform stream to keep only every opts.nShards'th object (starting from opts.ixShard)
 */
class ShardedDiscarder extends Transform {
  constructor(opts) {
    opts = opts || {};
    opts.objectMode = true;
    super(opts);

    this.ixShard = opts.ixShard;
    this.nShards = opts.nShards;
    this.ixDatum = -1;
    if ((typeof this.nShards !== "number") || (this.nShards <= 0)) {
      throw new Error(`opts.nShards must be a positive integer shard count: Got ${opts.nShards}`)
    }
    if ((typeof this.ixShard !== "number") || (this.ixShard < 0) || (this.ixShard >= this.nShards)) {
      throw new Error(`opts.ixShard must be an integer >= 0 and < opts.nShards. Got ${opts.ixShard}`);
    }
  }

  _transform(chunk, encoding, callback) {
    this.ixDatum = (this.ixDatum + 1) % this.nShards;
    if (this.ixDatum === this.ixShard) {
      callback(null, chunk);
    } else {
      callback();
    }
  }
}

/**
 * Writable object stream implementation to upload objects to DynamoDB
 * 
 * Includes a few utilities for transforming objects on the way through.
 */
class DynamoDBWriter extends Writable {
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
    this._writeBuffer = [];

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
          this._itemsWrittenSinceLog += bufferLen;
          if (this._itemsWrittenSinceLog >= this.progressGranularity) {
            // (Nobody likes scrolling through logs for days)
            console.log(
              `[${
                RESTYPE
              }] Wrote ${
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
          console.error(`[${RESTYPE}] Error in DynamoDB write`, err);
          console.error(`[${RESTYPE}] Write request:`, writeParams);
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
 * @param {number} ixShard Index of the shard of products to upload (others are ignored)
 * @param {number} nShards Total number of product shards (for positioning)
 * @returns {Promise<void>} resolving on completion
 * 
 * Sharding loads the S3 data stream, but only uploads every Nth item to DynamoDB; discarding the others.
 */
function loadProducts(source, ddbTableName, ixShard, nShards) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`Products source must be an s3:// URI - got '${source}'`);
  }

  ixShard = ixShard || 0;
  nShards = nShards || 1;

  const [srcBucket, srcKey] = source.slice("s3://".length).split(/\/(.*)/);
  return new Promise((resolve, reject) => {
    try {
      let failed = false;
      console.log(`[${RESTYPE}] Setting up stream from ${source}...`);
      writer = new DynamoDBWriter({
        batchSize: parseInt(process.env.DYNAMODB_WRITE_BATCH_SIZE) || 25,
        propDefaults: {
          "asin": undefined,  // (Just count for logs, don't set)
          "genre": "no genre",
          "imUrl": "no imUrl",
          "title": "no title",
        },
        tableName: ddbTableName,
        transform: productDynamoDbTransform,
      });

      writer.on("finish", () => {
        console.log(`[${RESTYPE}] Done uploading ${writer.itemsWritten} items to DynamoDB`);
        console.log(`[${RESTYPE}] Missing value counts: ${JSON.stringify(writer.missingValues)}`);
        if (!failed) resolve(writer.itemsWritten);
      });

      writer.on("error", (err) => {
        console.error(`[${RESTYPE}] Error in DynamoDB upload: `, err);
        if (!failed) reject(err);
        failed = true;
      });

      // Discard out-of-shard items:
      const discarder = new ShardedDiscarder({ ixShard, nShards });
      discarder.pipe(writer);

      // Chain of transformations to parse the input file:
      const { fileType, streams: parseStreams } = getParseChain(source);
      // Add error monitoring to every stage of the chain:
      parseStreams.forEach((s, i) => {
        s.on("error", (err) => {
          console.error(
            `[${RESTYPE}] Error in ${fileType} parser stage ${i + 1}/${parseStreams.length}: `,
            err,
          );
          if (!failed) reject(err);
          failed = true;
        });
      });
      parseStreams[parseStreams.length - 1].pipe(discarder);

      const reader = s3Client
        .getObject({
          Bucket: srcBucket,
          Key: srcKey,
        })
        .createReadStream();

      reader.on("error", (err) => {
        console.error(`[${RESTYPE}] Error in S3 stream: `, err);
        if (!failed) reject(err);
        failed = true;
      });

      // Finally plug the reader in to the rest of the pipeline:
      reader.pipe(parseStreams[0]);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * @param {Object} properties CloudFormation event.ResourceProperties
 * @returns {Object} ResourceProperties
 * @throws {Error} if validations fail
 */
function sanitizeResourceProps(properties) {
  if (!properties) {
    throw new Error("ResourceProperties not defined on request");
  } else if (!properties.Source) {
    throw new Error("Resource property 'Source' is required (S3 URI of source file)");
  } else if (!properties.TableName) {
    throw new Error("Resource property 'TableName' is required (Target DynamoDB table)");
  } else {
    if ("Shards" in properties) {
      if (typeof properties.Shards !== "number") properties.Shards = parseFloat(properties.Shards);
      if (properties.Shards < 1 || properties.Shards % 1 !== 0) {
        throw new Error("Resource property 'Shards', if provided, must be a positive integer");
      }
    } else {
      // Default 1 shard
      properties.Shards = 1;
    }

    if ("IxShard" in properties) {
      if (typeof properties.IxShard !== "number") properties.IxShard = parseFloat(properties.IxShard);
      if (properties.IxShard < 0 || properties.IxShard >= properties.Shards || properties.Shards % 1 !== 0) {
        throw new Error("Resource property 'IxShard', if provided, must be an integer 0..Shards-1");
      }
    } // No default required for IxShard
    
    return properties;
  }
}


/**
 * Lambda event handler for CloudFormation custom resource
 * @param {Object} event CloudFormation Lambda event
 * @param {Object} context CloudFormation Lambda context
 * @param {(Any, Any) => Any} callback 
 * @returns {undefined} Because callback or cfn-response are used to mark completion
 * 
 * This resource loads product data from an S3 file into DynamoDB. Deletion does nothing.
 * 
 * For low-effort scalability modestly beyond what would normally be possible with the Lambda timeout, the
 * resource recurses to call custom RequestType "CreateShard" for event.ResourceProperties.Shards times in
 * parallel.
 * 
 * Each shard invokation streams the same S3 source file, but only cleans and writes every Nth (# Shards)
 * item to DynamoDB. It's not the only, the tidiest, or the most scalable approach - but it achieves our
 * goal of scaling to ~300k products nicely with decent wall clock time performance.
 */
function handler(event, context, callback) {
  if (event.RequestType === "Create") {
    Promise.resolve()
      .then(() => sanitizeResourceProps(event.ResourceProperties))
      .then((props) => {
        console.log(`[${RESTYPE}] Loading data in ${props.Shards} shards`);
        return timeOutNativePromise(
          Promise.all(
            // For each ixShard in 0..Shards-1:
            [...Array(props.Shards).keys()].map((ixShard) => new Promise((resolve, reject) => {
              try {
                // Shallow copy is fine as we'll only be manipulating top-level properties:
                const shardProps = Object.assign({}, props);
                shardProps.IxShard = ixShard;
                const shardEvent = Object.assign({}, event);
                shardEvent.RequestType = "CreateShard";
                shardEvent.ResourceProperties = shardProps;
                console.log(`[${RESTYPE}] Invoking shard ${ixShard} of ${props.Shards}...`);
                lambdaClient.invoke(
                  { FunctionName: context.functionName, Payload: JSON.stringify(shardEvent) },
                  (err, data) => {
                    if (err) {
                      console.error(`[${RESTYPE}] Shard ${ixShard} of ${props.Shards} failed to run`);
                      reject(err);
                    } else if (data && (data.StatusCode >= 400 || data.FunctionError)) {
                      console.error(`[${RESTYPE}] Shard ${ixShard} of ${props.Shards} gave error`);
                      reject(new Error(data.FunctionError));
                    } else {
                      console.log(`[${RESTYPE}] Shard ${ixShard} of ${props.Shards} done`);
                      resolve(data);
                    }
                  }
                );
              } catch (err) {
                return reject(err);
              }
            }))
          ),
          // Give a bit of margin over the 15 minute Lambda limit:
          15 * 60 - 3
        )
      })
      .then(() => {
        console.log(`[${RESTYPE}] loaded product data`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.error(`[${RESTYPE}] Product data load failed`);
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          { Error: "Failed to upload items" },
        );
      });
  } else if (event.RequestType === "CreateShard") {
    Promise.resolve()
      .then(() => sanitizeResourceProps(event.ResourceProperties))
      .then((props) => timeOutNativePromise(
        loadProducts(props.Source, props.TableName, props.IxShard || 0, props.Shards || 1),
        // Give a bit of margin over the 15 minute Lambda limit:
        15 * 60 - 3
      ))
      .then(() => {
        const logMsg = `[${RESTYPE}] Shard ${event.ResourceProperties.IxShard || 0} created successfully`;
        console.log(logMsg);
        callback(
          null,
          { ixShard: event.ResourceProperties.IxShard || 0, message: logMsg }
        );
      })
      .catch((err) => {
        const logMsg = `[${RESTYPE}] Shard ${event.ResourceProperties.IxShard || 0} failed to create`;
        console.error(logMsg, err);
        try {
          callback({ error: err.message ? err.message : err, ixShard: event.ResourceProperties.IxShard || 0 });
        } catch {
          callback({ error: logMsg, ixShard: event.ResourceProperties.IxShard || 0 });
        }
      })
  } else {
    console.log(`event.RequestType ${event.RequestType} unknown - ignoring`);
    response.send(event, context, "SUCCESS");
  }
}

module.exports = {
  handler,
  resourceType: "Custom::ProductData",
  loadProducts,
};
