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
    GetListUrl: "/api-prod/recommendations/",
    GetDetailsUrl: "/api-prod/items/",
    ClickEventUrl: "/api-prod/clickevent",
    SearchUrl: "/api-prod/search",
    RecommendSimilar: "/api-prod/recommendationsitem/",
    GetDescriptionForProduct: "/api-prod/description"
  },
  user: {
    id: "AIXZKN4ACSKI"
  }
};
