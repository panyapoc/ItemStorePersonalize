const csv = require('csvtojson');
const AWS = require("aws-sdk");
const response = require('cfn-response');
const uuid = require("uuid");
const  documentClient = new AWS.DynamoDB.DocumentClient();
const  s3Client = new AWS.S3();

const csvFilePath = 'items_w_Metadata.csv';
// UploadItems - Upload sample set of items to DynamoDB
exports.handler = function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  if (event.RequestType === "Create") {
    console.log('reading csv');
    csv()
    .fromFile(csvFilePath)
    .then((jsonObj)=>{
        console.log(jsonObj);
        uploadItemsData(jsonObj);
        response.send(event,context, "SUCCESS");
        callback(null,"items uploaded");
    }).catch(function (err) {
      console.log('Error: ',err);
      var responseData = {
        Error: "Upload items failed"
      };
      console.log(responseData.Error);
      response.send(event, context, "FAILED", responseData);
    });
    return;
  } else {
    response.send(event,context, "SUCCESS");
    return;
  }
};

function uploadItemsData(item_items) {
  var items_array = [];
  for (var i in item_items) {
    var item = item_items[i];
    // console.log(item.ITEM_ID);
    var newitem = {
      PutRequest: {
        Item: {
          "asin" : item.ITEM_ID,
          "title" : item.TITLE,
          "imUrl" : item.IMGURL,
          "genre" : item.GENRE
        }
      }
    };
    items_array.push(newitem);
  }

  // Batch items into arrays of 25 for BatchWriteItem limit
  var split_arrays = [],
    size = 25;
  while (items_array.length > 0) {
    split_arrays.push(items_array.splice(0, size));
  }

  split_arrays.forEach(function (item_data) {
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
  batchWritePromise.then(function (data) {
    console.log(`${items_array.length} Items imported`);
  }).catch(function (err) {
    console.log(err);
  });
}