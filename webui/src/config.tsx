const Apitree = ''; // Cloudformation ProdDataEndpoint
const AnonymousPoolId = '' //Cloudformation WebUIAnonymousPoolId
const StreamName = '' // Cloudformation WebUIStreamName


export default {
  region: "us-east-1",
  kinesis:{
    StreamName: AnonymousPoolId,
    PartitionKey: "webpartition"
  },
  cognito: {
    AnonymousPoolId : StreamName
  },
  api: {
    GetListUrl: `${Apitree}/recommendations/`,
    GetDetailsUrl: `${Apitree}/items/`,
    ClickEventUrl: `${Apitree}/clickevent`,
    SearchUrl: `${Apitree}/search`,
    RecommendSimilar: `${Apitree}/recommendationsitem/`,
    GetDescriptionForProduct: `${Apitree}/description`
  },
  user: {
    id: "AIXZKN4ACSKI"
  }
};
