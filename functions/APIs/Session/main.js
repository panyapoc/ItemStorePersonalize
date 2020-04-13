"use strict";

// External Dependencies:
const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Create an imaginary session for a user - downloading the configuration needed to run the site.
exports.handler = (event, context, callback) => {
  // Return immediately if being called by warmer
  if (event.source === "warmer") {
    return callback(null, "Lambda is warm");
  }

  // CORS config:
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials" : true
  };

  dynamoDb.scan({ TableName: process.env.USERS_TABLE_NAME }, (err, userData) => {
    if (err) {
      console.error("Couldn't query DynamoDB users table", err);
      callback(
        null,
        {
          statusCode: 500,
          headers: headers,
          body: JSON.stringify({
            message: "Couldn't retrieve list of users from DynamoDB. See CloudWatch logs for more details",
          }),
        },
      );
      return;
    } else {
      callback(
        null,
        {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify({
            AnonymousPoolId: process.env.IDENTITY_POOL_ID,
            StreamName: process.env.KINESIS_STREAM_NAME,
            // PascalCase the camelCased DynamoDB field attributes, for API consistency:
            UserList: userData.Items.map(u => Object.keys(u).reduce(
              (acc, rawKey) => {
                const pascalKey = rawKey[0].toLocaleUpperCase() + rawKey.substr(1);
                acc[pascalKey] = u[rawKey];
                return acc;
              },
              {},
            )),
          }),
        }
      )
    }
  });
}
