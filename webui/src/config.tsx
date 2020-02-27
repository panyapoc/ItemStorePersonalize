// Apitree use output Cloudformation ProdDataEndpoint or via cloudfront use "Prod/
const Apitree = '/Prod/'; // Cloudformation ProdDataEndpoint
const AnonymousPoolId = 'us-east-1:485e95e2-3f4f-44a5-a704-c73543b144a6' //Cloudformation WebUIAnonymousPoolId
const StreamName = 'teststr-Clickstream' // Cloudformation WebUIStreamName


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
