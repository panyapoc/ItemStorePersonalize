// External Dependencies:
const response = require("cfn-response");

// Local Dependencies:
const resources = require("./lib/resources");

const resourceArr = Object.keys(resources).map((key) => (resources[key]));

/**
 * Composite handler for multiple custom resource types to share a single Lambda function
 * See items in ./lib/resources for each type's implementation
 */
exports.handler = function setup(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const resource = resourceArr.find((res) => (res.resourceType === event.ResourceType));
  if (resource) {
    return resource.handler(event, context, callback);
  } else {
    console.error(
      `Unrecognised resource type ${
        event.ResourceType
      } not in known list: ${
        resourceArr.map((res) => res.resourceType).join(", ")
      }`
    );
    return response.send(
      event,
      context,
      "FAILED",
      { Error: `Unrecognised resource type ${event.ResourceType}` },
    );
  }
};
