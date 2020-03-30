// By adding both S3 and API Gateway origins to CloudFront hosting, we call the API through the same domain
// as the website is served from. One limitation is that CloudFront won't transform the paths of requests
// before forwarding to the origin, so our API Gateway Stage name (which will be 'Prod' by default) must be
// the same as our CloudFront forwarding path:
const Apitree = "/Prod/";

// Define static config properties:
// (Setting dynamically-initialized props to null with override type annotation for TS)
const staticConfig = {
  region: "us-east-1",
  kinesis: {
    // Force (string|undefined) env vars to string, to keep TypeScript happy:
    StreamName: null as unknown as string, //`${process.env.REACT_APP_EVENT_STREAM_NAME}`,
    PartitionKey: "webpartition"
  },
  cognito: {
    AnonymousPoolId : null as unknown as string, //`${process.env.REACT_APP_ANONYMOUS_POOL_ID}`,
  },
  api: {
    GetListUrl: `${Apitree}recommendations/`,
    GetDetailsUrl: `${Apitree}items/`,
    ClickEventUrl: `${Apitree}clickevent`,
    SearchUrl: `${Apitree}search`,
    SessionUrl: `${Apitree}session`,
    RecommendSimilar: `${Apitree}recommendationsitem/`,
    GetDescriptionForProduct: `${Apitree}description`
  },
  user: {
    id: "AIXZKN4ACSKI"
  }
};

interface DynamicConfig {
  AnonymousPoolId: string,
  StreamName: string,
}

async function initSession() {
  const dynamicConfigResponse = await fetch(staticConfig.api.SessionUrl)
  if (!dynamicConfigResponse.ok) {
    throw new Error("Failed to start session");
  }

  const dynamicConfig: DynamicConfig = await dynamicConfigResponse.json();

  // Doesn't matter that we'll just override the staticConfig, since session is one-shot:
  staticConfig.kinesis.StreamName = dynamicConfig.StreamName;
  staticConfig.cognito.AnonymousPoolId = dynamicConfig.AnonymousPoolId;

  return staticConfig;
}

const initSessionP = initSession();

export default () => initSessionP;
