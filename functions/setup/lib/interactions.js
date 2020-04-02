// External Dependencies:
const AWS = require("aws-sdk");

const s3Client = new AWS.S3();

function create(source, dest) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`Interactions source must be an s3:// URI - got '${source}'`);
  }
  if (!dest.toLowerCase().startsWith("s3://")) {
    throw new Error(`Interactions dest must be an s3:// URI if provided - got '${dest}'`);
  }

  const srcFileName = source.substring(source.lastIndexOf("/") + 1);
  const [destBucket, destPrefix] = dest.slice("s3://".length).split(/\/(.*)/);

  console.log(`Copying ${source} to ${dest}`)
  return s3Client.copyObject({
    Bucket: destBucket,
    CopySource: source.slice("s3://".length),
    Key: `${destPrefix}/${srcFileName}`,
  }).promise();
}

function destroy(source, dest) {
  if (!source.toLowerCase().startsWith("s3://")) {
    throw new Error(`Interactions source must be an s3:// URI - got '${source}'`);
  }
  if (!dest.toLowerCase().startsWith("s3://")) {
    throw new Error(`Interactions dest must be an s3:// URI if provided - got '${dest}'`);
  }

  const srcFileName = source.substring(source.lastIndexOf("/") + 1);
  const [destBucket, destPrefix] = dest.slice("s3://".length).split(/\/(.*)/);
  console.log(`Deleting s3://${destBucket}/${destPrefix}/${srcFileName}...`);
  // This returns success if the object is already deleted, so no error catching required:
  return s3Client.deleteObject({
    Bucket: destBucket,
    Key: `${destPrefix}/${srcFileName}`,
  }).promise();
}

module.exports = {
  create,
  destroy,
};