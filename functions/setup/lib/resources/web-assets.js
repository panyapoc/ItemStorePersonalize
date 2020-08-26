// External Dependencies:
const AWS = require("aws-sdk");
const response = require("cfn-response");
const JSZip = require("jszip");
const mime = require("mime-types");

const s3Client = new AWS.S3();
const RESTYPE = "WEB";

/**
 * Extract a zip archive from one S3 bucket into another.
 * @param {string} source s3:// URI of a zipped web assets bundle
 * @param {string} dest s3:// URI of a bucket + folder to extract assets
 * 
 * Downloads the zip to memory, extracts and uploads up to process.env.N_CONCURRENT_UPLOADS at a
 * time in memory.
 */
async function copyAssets(source, dest) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`source must be an s3:// URI - got '${source}'`);
  }
  if (!dest.toLowerCase().startsWith("s3://")) {
    throw new Error(`dest must be an s3:// URI - got '${source}'`);
  }

  const [srcBucket, srcKey] = source.slice("s3://".length).split(/\/(.*)/);
  const [destBucket, destKey] = dest.slice("s3://".length).split(/\/(.*)/);

  console.log(`[${RESTYPE}] Fetching web UI assets from ${source}...`);
  const data = await s3Client.getObject({
    Bucket: srcBucket,
    Key: srcKey,
  }).promise();
  const zipData = await JSZip.loadAsync(data.Body);

  // VERY naive limited parallelism:
  const maxConcurrent = parseInt(process.env.N_CONCURRENT_UPLOADS) || 5;
  const uploadPromises = [];
  for (let i = 0; i < maxConcurrent; ++i) {
    uploadPromises.push(Promise.resolve())
  }
  let i = -1;
  zipData.forEach((relPath, item) => {
    if (!item.dir) {
      i = (i + 1) % maxConcurrent;
      uploadPromises[i] = uploadPromises[i].then(async () => {
        console.log(`[${RESTYPE}] Uploading ${relPath}...`);
        return item.async("nodebuffer")
          .then((itemBody) => 
            s3Client.putObject({
              Body: itemBody,
              Bucket: destBucket,
              // API needs explicit content type or it will assume application/octet-stream: (-__-)
              ContentType: mime.lookup(relPath) || "text/plain",
              Key: destKey + (destKey.endsWith("/") ? "" : "/") + relPath,
            }).promise()
          );
      });
    }
  });

  await Promise.all(uploadPromises);
  console.log(`[${RESTYPE}] Done uploading web assets!`);
}

/**
 * Delete all objects from S3 `dest` (buckets can't be deleted unless they're empty)
 */
async function deleteAssets(dest) {
  if (!dest.toLowerCase().startsWith("s3://")) {
    throw new Error(`dest must be an s3:// URI - got '${source}'`);
  }

  const [destBucket, destKey] = dest.slice("s3://".length).split(/\/(.*)/);
  let isEmpty = false;
  let deleted = [];

  while (!isEmpty) {
    const objList = await s3Client.listObjectsV2({
      Bucket: destBucket,
      Prefix: destKey,
    }).promise();

    let targets = objList.Contents.map(o => ({ Key: o.Key }));

    if (!objList.Contents.length) {
      isEmpty = true;
      break;
    }

    await s3Client.deleteObjects({
      Bucket: destBucket,
      Delete: {
        Objects: targets
      }
    }).promise();
    deleted = deleted.concat(targets);

    // If list was complete, we're now done and don't need to check again:
    if (!objList.IsTruncated) isEmpty = false;
  }

  console.log(`[${RESTYPE}] Destination empty after deleting ${deleted.length} objects`);
  return deleted;
}

/**
 * Lambda event handler for CloudFormation custom resource
 * @param {Object} event CloudFormation Lambda event
 * @param {Object} context CloudFormation Lambda context
 * @returns {undefined} Because Lambda completion is delegated to cfn-response
 * 
 * (3rd `callback` argument not required due to use of cfn-response)
 * 
 * Resource extracts the contents of an S3-hosted zip file (ResourceProperties.Source) into a target S3
 * folder URI (ResourceProperties.Target) on creation; and clears the contents of ResourceProperties.Target
 * on deletion.
 */
function handler(event, context) {
  if (event.RequestType === "Create") {
    Promise.resolve()
      .then(() => {
        if (!event.ResourceProperties) {
          throw new Error("ResourceProperties not defined on request");
        } else if (!event.ResourceProperties.Source) {
          throw new Error("Resource property 'Source' is required (S3 URI of source zip)");
        } else if (!event.ResourceProperties.Target) {
          throw new Error("Resource property 'Target' is required (S3 URI of destination folder)");
        } else {
          return event.ResourceProperties;
        }
      })
      .then((props) => copyAssets(props.Source, props.Target))
      .then(() => {
        console.log(`[${RESTYPE}] Copied web assets`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.error(`[${RESTYPE}] Web asset copy failed`);
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          { Error: "Failed to upload items" },
        );
      });
  } else if (event.RequestType === "Delete") {
    Promise.resolve()
      .then(() => {
        if (!event.ResourceProperties) {
          throw new Error("ResourceProperties not defined on request");
        } else if (!event.ResourceProperties.Target) {
          throw new Error("Resource property 'Target' is required (S3 URI of destination folder)");
        } else {
          return event.ResourceProperties;
        }
      })
      .then((props) => deleteAssets(props.Target))
      .then(() => {
        console.log(`[${RESTYPE}] Deleted web assets`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.log(`[${RESTYPE}] Failed to delete web assets`);
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          { Error: "Failed to delete items" },
        );
      });
  } else {
    console.log(`event.RequestType ${event.RequestType} unknown - ignoring`);
    response.send(event, context, "SUCCESS");
  }
}

module.exports = {
  handler,
  resourceType: "Custom::WebAssets",
};
