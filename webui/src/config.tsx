const apitree = 'https://hpr4qcneol.execute-api.us-east-1.amazonaws.com/Prod';

export default {
  region: "us-east-1",
  kinesis:{
    StreamName: "pocstor-Clickstream",
    PartitionKey: "webpartition"
  },
  cognito: {
    SignInUrl: "https://all-store.auth.us-east-1.amazoncognito.com/login?response_type=code&client_id=2nr6bddje6ekkd93ac79bsd4l2&redirect_uri=http://localhost:3000/login",
    AnonymousPoolId : "us-east-1:5cd563db-7e9b-44f2-97c6-abfe475be5d4"

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
