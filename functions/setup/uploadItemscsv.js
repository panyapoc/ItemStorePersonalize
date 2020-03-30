// External Dependencies:
const AWS = require("aws-sdk");
const response = require("cfn-response");
const csv = require("csvtojson");

// Local Dependencies:
const webAssets = require("./lib/web-assets");

const documentClient = new AWS.DynamoDB.DocumentClient();

const csvFilePath = "items_w_Metadata.csv";
// UploadItems - Upload sample set of items to DynamoDB
exports.handler = function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  if (event.RequestType === "Create") {
    // In parallel:
    Promise.all([
      // Copy web assets to deployment bucket:
      webAssets.copyAssets(process.env.WEB_ASSETS_SOURCE, process.env.WEB_DEPLOYMENT_LOCATION),
      // Upload CSV items to DynamoDB:
      csv().fromFile(csvFilePath)
        .then((jsonObj) => {
          console.log(jsonObj);
          return uploadItemsData(jsonObj);
        })
    ])
      .then(() => {
        response.send(event, context, "SUCCESS");
        callback(null, "items uploaded");
      })
      .catch((err) => {
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          {
            Error: "Upload items failed",
          }
        );
        callback(err);
      });
  } else if (event.RequestType === "Delete") {
    console.log(`Clearing web bucket deployment ${process.env.WEB_DEPLOYMENT_LOCATION}`);
    webAssets.deleteAssets(process.env.WEB_DEPLOYMENT_LOCATION)
      .then(() => {
        response.send(event, context, "SUCCESS");
        callback(null, "items deleted");
      })
      .catch((err) => {
        console.error(err);
        response.send(
          event,
          context,
          "FAILED",
          {
            Error: "Delete items failed",
          }
        );
        callback(err);
      });
  } else {
    console.log(`event.RequestType ${event.RequestType} unknown - ignoring`);
    response.send(event, context, "SUCCESS");
    callback(null, "no action to take");
  }
};

function uploadItemsData(item_items) {
  const items_array = [];
  for (let i in item_items) {
    const item = item_items[i];
    // console.log(item.ITEM_ID);
    items_array.push({
      PutRequest: {
        Item: {
          "asin" : item.ITEM_ID,
          "title" : item.TITLE ? item.TITLE : "no title",
          "imUrl" : item.IMGURL ? item.IMGURL : "no imUrl",
          "genre" : item.GENRE ? item.GENRE : "no tags",
        }
      }
    });
  }

  // Batch items into arrays of 25 for BatchWriteItem limit
  const batchSize = parseInt(process.env.DYNAMODB_WRITE_BATCH_SIZE) || 25;
  const split_arrays = [];
  while (items_array.length > 0) {
    split_arrays.push(items_array.splice(0, batchSize));
  }

  let batchPromise = Promise.resolve();
  split_arrays.forEach((item_data) => {
    batchPromise = batchPromise.then(() => putItem(item_data));
  });

  return batchPromise;
}

/**
 * Batch write items to DynamoDB
 * @param {*} items_array 
 * @returns {Promise<void>} Rejecting if upload fails.
 */
function putItem(items_array) {
  const tableName = process.env.TABLE_NAME; // [ProjectName]-Items
  const params = {
    RequestItems: {
      [tableName]: items_array
    }
  };
  const batchWritePromise = documentClient.batchWrite(params).promise();
  return batchWritePromise.then(() => {
    console.log(`${items_array.length} Items imported`);
  }).catch((err) => {
    console.log(err);
    throw err;
  });
}
