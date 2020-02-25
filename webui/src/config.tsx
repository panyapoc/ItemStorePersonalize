const Apitree = 'https://qgehhm7uea.execute-api.us-east-1.amazonaws.com/Prod/'; // Cloudformation ProdDataEndpoint
const AnonymousPoolId = 'us-east-1:545cb159-174b-4ac0-96b3-e6cec441b18c' //Cloudformation WebUIAnonymousPoolId
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
