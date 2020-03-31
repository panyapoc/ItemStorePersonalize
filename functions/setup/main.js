// External Dependencies:
const response = require("cfn-response");

// Local Dependencies:
const products = require("./lib/products");
const webAssets = require("./lib/web-assets");

/**
 * Handle web UI upload/deletion, and product item DynamoDB upload for CloudFormation
 * 
 * TODO: Does it make sense to split these tasks into separate CF resources / Lambdas?
 */
exports.handler = function setup(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  if (event.RequestType === "Create") {
    // In parallel:
    Promise.all([
      // Copy web assets to deployment bucket:
      webAssets.copyAssets(process.env.WEB_ASSETS_SOURCE, process.env.WEB_DEPLOYMENT_LOCATION),
      // Upload product items to DynamoDB (if env var provided):
      process.env.PRODUCTS_SOURCE
        ? products.loadProducts(process.env.PRODUCTS_SOURCE, process.env.PRODUCTS_TABLE_NAME)
        : new Promise((resolve) => {
          console.warn("Skipping product data upload: no PRODUCTS_SOURCE env var provided");
          return resolve();
        }),
    ])
      .then(() => {
        console.log("Reporting success");
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
