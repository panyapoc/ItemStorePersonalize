"use strict";

// Create an imaginary session for a user - downloading the configuration needed to run the site.
exports.handler = (event, context, callback) => {
  // Return immediately if being called by warmer
  if (event.source === "warmer") {
    return callback(null, "Lambda is warm");
  }

  callback(
    null,
    {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify({
        AnonymousPoolId: process.env.IDENTITY_POOL_ID,
        StreamName: process.env.KINESIS_STREAM_NAME,
      }),
    }
  );
}
