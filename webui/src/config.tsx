// Apitree use output Cloudformation ProdDataEndpoint or via cloudfront use "Prod/
const Apitree = '/Prod/'; // Cloudformation ProdDataEndpoint
const AnonymousPoolId = 'Put Cloudformation Output WebUIAnonymousPoolId here' //Cloudformation WebUIAnonymousPoolId
const StreamName = 'Put WebUIStreamName Output WebUIAnonymousPoolId here' // Cloudformation WebUIStreamName


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
