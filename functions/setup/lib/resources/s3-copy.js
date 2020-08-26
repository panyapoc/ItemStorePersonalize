/**
 * Custom Resource Lambda for copying S3 objects
 */

 // External Dependencies:
const AWS = require("aws-sdk");
const response = require("cfn-response");

const s3Client = new AWS.S3();
const RESTYPE = "S3COPY";

/**
 * Copy an S3 object into an S3 folder (preserving its original filename)
 * @param {string} from s3://... URI of source object to copy
 * @param {string} to s3://... folder URI into which `from` will be copied (preserving original filename)
 * @param {string} name="Untitled" Artifact name used for labelling log messages only
 * @returns {Promise<void>}
 */
function copyAsset(from, to, name="Untitled") {
  if (!from.toLowerCase().startsWith("s3://")) {
    throw new Error(`${name} asset From must be an s3:// URI - got '${from}'`);
  }
  if (!to.toLowerCase().startsWith("s3://")) {
    throw new Error(`${name} asset To must be an s3:// URI - got '${to}'`);
  }

  const srcFileName = from.substring(from.lastIndexOf("/") + 1);
  const [toBucket, toPrefix] = to.slice("s3://".length).split(/\/(.*)/);

  console.log(`[${RESTYPE}] Copying ${from} to ${to}`)
  return s3Client.copyObject({
    Bucket: toBucket,
    CopySource: from.slice("s3://".length),
    Key: `${toPrefix}/${srcFileName}`,
  }).promise();
}
/**
 * Delete the S3 object created by a copyAsset call with equivalent from & to params
 * @param {string} from s3://... URI of original source object to copy
 * @param {string} to s3://... folder URI from which the copied file will be deleted
 * @param {string} name="Untitled" Artifact name used for labelling log messages only
 * @returns {Promise<void>}
 */
function destroyAsset(from, to, name="Untitled") {
  if (!from.toLowerCase().startsWith("s3://")) {
    throw new Error(`${name} asset From must be an s3:// URI - got '${from}'`);
  }
  if (!to.toLowerCase().startsWith("s3://")) {
    throw new Error(`${name} asset To must be an s3:// URI - got '${to}'`);
  }

  const srcFileName = from.substring(from.lastIndexOf("/") + 1);
  const [toBucket, toPrefix] = to.slice("s3://".length).split(/\/(.*)/);
  console.log(`[${RESTYPE}] Deleting s3://${toBucket}/${toPrefix}/${srcFileName}...`);
  // This returns success if the object is already deleted, so no error catching required:
  return s3Client.deleteObject({
    Bucket: toBucket,
    Key: `${toPrefix}/${srcFileName}`,
  }).promise();
}

/**
 * @param {Object} properties CloudFormation event.ResourceProperties
 * @returns {Object} ResourceProperties (modified in-place)
 * @throws {Error} if validations fail
 */
function sanitizeResourceProps(properties) {
  if (!properties) {
    throw new Error("ResourceProperties not defined on request");
  } else if (!Array.isArray(properties.Items)) {
    throw new Error("Resource property 'Items' is required (Sequence of From/To/(Name) descriptors)");
  }

  properties.Items = properties.Items.filter(
    (item) => {
      if (!item.To) {
        return false;
      } else if (!item.From) {
        throw new Error(`Item${item.Name ? ` ${item.Name}` : ""} has 'To' but no 'From'`);
      } else {
        return true;
      }
    }
  )
  
  return properties;
}


/**
 * Lambda event handler for CloudFormation custom resource
 * @param {Object} event CloudFormation Lambda event
 * @param {Object} context CloudFormation Lambda context
 * @returns {undefined} Because Lambda completion is delegated to cfn-response
 * 
 * (3rd `callback` argument not required due to use of cfn-response)
 * 
 * For each item in the ResourceProperties.Items list, this resource copies the S3 object from `item.From`
 * into the folder given by `item.To`, preserving the object's original filename. On deletion, the resource
 * deletes the S3 target artifacts identified by its Properties.
 */
function handler(event, context) {
  if (event.RequestType === "Create") {
    Promise.resolve()
      .then(() => sanitizeResourceProps(event.ResourceProperties))
      .then((props) => Promise.all(
        props.Items.map((item) => copyAsset(item.From, item.To, item.Name || "Untitled"))
      ))
      .then(() => {
        console.log(`[${RESTYPE}] Copied assets`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.error(`[${RESTYPE}] Asset copy failed`);
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
      .then(() => sanitizeResourceProps(event.ResourceProperties))
      .then((props) => Promise.all(
        props.Items.map((item) => destroyAsset(item.From, item.To, item.Name || "Untitled"))
      ))
      .then(() => {
        console.log(`[${RESTYPE}] Deleted assets`);
        response.send(event, context, "SUCCESS");
      })
      .catch((err) => {
        console.error(`[${RESTYPE}] Asset delete failed`);
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          { Error: "Failed to delete items" },
        );
      });
  } else {
    console.log(`[${RESTYPE}] event.RequestType ${event.RequestType} unknown - ignoring`);
    response.send(event, context, "SUCCESS");
  }
}

module.exports = {
  handler,
  resourceType: "Custom::S3Copy",
};
