// Cloudformation ProdDataEndpoint
// via cloudfront api use api/
const Apitree = 'https://oy13u4yhcf.execute-api.us-east-1.amazonaws.com/Prod/'; // Cloudformation ProdDataEndpoint
const AnonymousPoolId = 'us-east-1:74e1de2e-391f-4437-918f-b6f067c98a53' //Cloudformation WebUIAnonymousPoolId
const StreamName = 'pstore-Clickstream' // Cloudformation WebUIStreamName


export default {
  region: "us-east-1",
  kinesis:{
    StreamName: StreamName,
    PartitionKey: "webpartition"
  },
  cognito: {
    AnonymousPoolId : AnonymousPoolId
  },
  api: {
    GetListUrl: `${Apitree}recommendations/`,
    GetDetailsUrl: `${Apitree}items/`,
    ClickEventUrl: `${Apitree}clickevent`,
    SearchUrl: `${Apitree}search`,
    RecommendSimilar: `${Apitree}recommendationsitem/`,
    GetDescriptionForProduct: `${Apitree}description`
  },
  user: {
    id: "AIXZKN4ACSKI"
  }
};
