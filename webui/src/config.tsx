const apitree = 'https://hpr4qcneol.execute-api.us-east-1.amazonaws.com/Prod';

export default {
  region: "us-east-1",
  kinesis:{
    PartitionKey: "PartitionKey",
    StreamName: "StreamName"
  },
  cognito: {
    SignInUrl: "https://all-store.auth.us-east-1.amazoncognito.com/login?response_type=code&client_id=2nr6bddje6ekkd93ac79bsd4l2&redirect_uri=http://localhost:3000/login",
    AnonymousPoolId : "AnonymousPoolId"

  },
  api: {
    GetListUrl: `${apitree}/recommendations/`,
    GetDetailsUrl: `${apitree}/items/`,
    ClickEventUrl: `${apitree}/clickevent`,
    SearchUrl: `${apitree}/search`,
    RecommendSimilar: `${apitree}/recommendationsitem/`,
    GetDescriptionForProduct: `${apitree}/description`
  },
  user: {
    id: "AIXZKN4ACSKI"
  }
};
