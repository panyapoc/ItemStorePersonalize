// By adding both S3 and API Gateway origins to CloudFront hosting, we call the API through the same domain
// as the website is served from. One limitation is that CloudFront won't transform the paths of requests
// before forwarding to the origin, so our API Gateway Stage name (which will be 'Prod' by default) must be
// the same as our CloudFront forwarding path:
const Apitree = "/Prod/";

export default {
  region: "us-east-1",
  kinesis:{
    // Force (string|undefined) env vars to string, to keep TypeScript happy:
    StreamName: `${process.env.REACT_APP_EVENT_STREAM_NAME}`,
    PartitionKey: "webpartition"
  },
  cognito: {
    AnonymousPoolId : `${process.env.REACT_APP_ANONYMOUS_POOL_ID}`,
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
