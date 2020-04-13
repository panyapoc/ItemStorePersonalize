/**
 * Custom Resource Lambda for loading product CSV/JSON into DynamoDB
 */

// External Dependencies:
const AWS = require("aws-sdk");
const response = require("cfn-response");

// Local Dependencies:
const { getParseChain } = require("../util/data");
const DynamoDBWriter = require("../util/ddb-writer");
const { timeOutNativePromise } = require("../util/promises");

const s3Client = new AWS.S3();
const RESTYPE = "USERS";

/**
 * Stream user data from S3 source file into this stack's DynamoDB users table
 * @param {string} source s3:// URI of an item data file
 * @param {string} ddbTableName DynamoDB table name to send data to
 * @returns {Promise<void>} resolving on completion
 */
function loadUsers(source, ddbTableName) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`Users source must be an s3:// URI - got '${source}'`);
  }

  const [srcBucket, srcKey] = source.slice("s3://".length).split(/\/(.*)/);
  return new Promise((resolve, reject) => {
    try {
      let failed = false;
      console.log(`[${RESTYPE}] Setting up stream from ${source}...`);
      writer = new DynamoDBWriter({
        batchSize: parseInt(process.env.DYNAMODB_WRITE_BATCH_SIZE) || 25,
        propDefaults: {
          "id": undefined,  // (Just count for logs, don't set)
          "firstName": "Mysterious",
          "lastName": "Ghost",
        },
        tableName: ddbTableName,
      });

      writer.on("finish", () => {
        console.log(`[${RESTYPE}] Done uploading ${writer.itemsWritten} users to DynamoDB`);
        console.log(`[${RESTYPE}] Missing value counts: ${JSON.stringify(writer.missingValues)}`);
        if (!failed) resolve(writer.itemsWritten);
      });

      writer.on("error", (err) => {
        console.error(`[${RESTYPE}] Error in DynamoDB upload: `, err);
        if (!failed) reject(err);
        failed = true;
      });

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
      parseStreams[parseStreams.length - 1].pipe(writer);

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
 * This resource loads user data from an S3 file into DynamoDB. Deletion does nothing.
 */
function handler(event, context, callback) {
  if (event.RequestType === "Create") {
    Promise.resolve()
      .then(() => sanitizeResourceProps(event.ResourceProperties))
      .then((props) => timeOutNativePromise(
        loadUsers(props.Source, props.TableName),
        // Give a bit of margin over the 15 minute Lambda limit:
        15 * 60 - 3
      ))
      .then(() => {
        console.log(`[${RESTYPE}] loaded user data`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.error(`[${RESTYPE}] User data load failed`);
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          { Error: "Failed to upload users" },
        );
      });
  } else {
    console.log(`event.RequestType ${event.RequestType} unknown - ignoring`);
    response.send(event, context, "SUCCESS");
  }
}

module.exports = {
  handler,
  resourceType: "Custom::UserData",
  loadUsers,
};
