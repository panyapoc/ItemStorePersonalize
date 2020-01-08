export default {
    cognito:{
    SignInUrl:"https://all-store.auth.us-east-1.amazoncognito.com/login?response_type=code&client_id=2nr6bddje6ekkd93ac79bsd4l2&redirect_uri=http://localhost:3000/login"
},
api:{
        GetListUrl:
            "https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/recommendations/",
            GetDetailsUrl:"https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/items/",

        ClickEventUrl: 
            "https://m5vjw7stec.execute-api.us-east-1.amazonaws.com/test/clickevent",
        SearchUrl:"https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/search",
        RecommendSimilar:"https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/recommendationsitem/",
        GetDescriptionForProduct:"https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/description"
        

},
user:{
    id:"AIXZKN4ACSKI"
}

}