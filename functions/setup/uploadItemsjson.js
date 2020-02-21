"use strict";

const https = require("https");
const url = require("url");

var AWS = require("aws-sdk"),
uuid = require("uuid"),
documentClient = new AWS.DynamoDB.DocumentClient(),
s3Client = new AWS.S3;

// UploadItems - Upload sample set of items to DynamoDB
exports.handler = function(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (event.RequestType === "Create") {
    getItemsData().then(function(data) {
      var itemsString = data.Body.toString("utf-8").replace(/\""/g, "null");
      var itemsList = JSON.parse(itemsString);
      uploadItemsData(itemsList);
    }).catch(function(err) {
      console.log(err);
      var responseData = { Error: "Upload items failed" };
      console.log(responseData.Error);
      sendResponse(event, callback, context.logStreamName, "FAILED", responseData);
    });
    // sendResponse(event, callback, context.logStreamName, "SUCCESS");
    return;
  } else {
    sendResponse(event, callback, context.logStreamName, "SUCCESS");
    return;
  }
};
function uploadItemsData(item_items) {
  var items_array = [];
  for (var i in item_items) {
    var item = item_items[i];
    // console.log(item.asin)
    var item = {
      PutRequest: {
       Item: item
      }
    };
    items_array.push(item);
  }

  // Batch items into arrays of 25 for BatchWriteItem limit
  var split_arrays = [], size = 25;
    while (items_array.length > 0) {
        split_arrays.push(items_array.splice(0, size));
    }

  split_arrays.forEach( function(item_data) {
    putItem(item_data);
  });
}

// Retrieve sample items from aws-itemstore-demo S3 Bucket
function getItemsData() {
  var params = {
    Bucket: process.env.S3_BUCKET, // aws-itemstore-demo
    Key: process.env.FILE_NAME // data/items.json
 };
 return s3Client.getObject(params).promise();
}

// Batch write items to DynamoDB
function putItem(items_array) {
  var tableName = process.env.TABLE_NAME; // [ProjectName]-Items
  var params = {
    RequestItems: {
      [tableName]: items_array
    }
  };
  var batchWritePromise = documentClient.batchWrite(params).promise();
  batchWritePromise.then(function(data) {
    console.log("Items imported");
  }).catch(function(err) {
    console.log(err);
  });
}

// Send response back to CloudFormation template runner
function sendResponse(event, callback, logStreamName, responseStatus, responseData) {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
    PhysicalResourceId: logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  console.log("RESPONSE BODY:\n", responseBody);

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  const req = https.request(options, (res) => {
    console.log("STATUS:", res.statusCode);
    console.log("HEADERS:", JSON.stringify(res.headers));
    callback(null, "Successfully sent stack response!");
  });

  req.on("error", (err) => {
    console.log("sendResponse Error:\n", err);
    callback(err);
  });

  req.write(responseBody);
  req.end();
}
