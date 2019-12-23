# ItemStore

## Folder Structure

```
├── Personalize                                    [DataPipeline Notebook]
│   ├── 1.Building_Campaign_HRNN.ipynb
│   ├── 2.Building_Campaign_P-rank.ipynb
│   ├── 3.View_Campaign_And_Interactions_jit.ipynb
│   ├── Data\ Loader.ipynb
│   ├── Datasets
│   │   ├── allstore-ratings.csv
│   │   ├── convertcsv.csv
│   │   ├── items_w_Metadata.csv
│   │   ├── ratings.csv
│   │   └── users.csv
│   └── PersonalizeUnicornGymDemo.yaml
├── README.md                                       [README]
├── data                                            [Raw data Repo]
├── deploycli.sh                                    [Deployment Script]
├── functions                                       [Lambda Fuction Repo]
│   ├── APIs                                        [API Lamdba Fuction Repo]
│   │   ├── Getitem                                 [Getitem]
│   │   ├── ListItems                               [ListItems]
│   │   ├── PostClickEvent                          [PostClickEvent]
│   │   ├── Search                                  [Search]
│   │   ├── SearchRerank                            [SearchRerank]
│   │   ├── getRecommendation                       [getRecommendation]
│   │   └── getRecommendationByItem                 [getRecommendationByItem]
│   ├── setup                                       [Setup Lambda Fuction]
│   └── streaming                                   [Streaming Lambda Fuction]
│       └── UpdateSearchCluster
└── template.yaml                                   [SAM Cloudformation Template]
```

## Prerequisite

1. AWS Account
2. S3 Bucket to package the source code to
3. AWS SAM CLI
4. Create service link role for ES

```
aws iam create-service-linked-role \
--aws-service-name es \
--description "My service-linked role to Amazon ElasticSearch"
```

## Deployment

1. Run deployment script

```bin/bash
sh deploycli.sh <s3bucketname> <stackname> <AWSprofile (optional)>
```

* s3bucketname    - bucket for storing built source code
* stackname       - stackname ⚠️ have to be lower case up to 12 char ⚠️
* AWSprofile      - API profile name (optional). if leave blank SAM will use the default profile

02. Wait around 30 mins for the entier stack to deploy

## Post Deployment

1. Goto [Personalize](https://github.com/panyapoc/ItemStorePersonalize/tree/master/Personalize) to start Creating Campaign
2. Once the Campaign is deploy go to the following fuction
    * Rerank
    * GetRecommendations
    * GetRecommendationsByItem
3. In the environment section and replace the ARN with the one create from jupyter notebook.

# API doc
## /items/{id}
Get item by item id (asin)

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/items/B00004NKIQ
```

``` Respose Example
{
    "rekognition": "[\"Crib\",\"Furniture\",\"Fence\"]",
    "asin": "B00004NKIQ",
    "imUrl": "http://ecx.images-amazon.com/images/I/515sDhGh5aL._SY300_.jpg",
    "title": "Franklin Sports Adjustable Soccer Rebounder (6-Feet by 4-Feet)"
}
```

## /recommendations
Get item recommendations anonymously

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/recommendations/
```

``` Respose Example
[{
    "rekognition": "[\"Electronics\",\"Helmet\",\"Clothing\",\"Apparel\",\"Headphones\",\"Headset\"]",
    "asin": "B001T7QJ9O",
    "imUrl": "http://ecx.images-amazon.com/images/I/41bcSICIjBL._SY300_.jpg",
    "title": "Howard Leight R-01526 Impact Sport Electronic Earmuff"
}, {
    "rekognition": "[\"Electronics\",\"Camera\",\"Video Camera\"]",
    "asin": "B001BQZSZ4",
    "imUrl": "http://ecx.images-amazon.com/images/I/51OME86be7L._SX300_.jpg",
    "title": "Leapers Golden Image 38mm Red/Green Dot Sight, Integral Weaver Mount (SCP-RD40RGW)"
},...]
```

## /recommendations/{userId}
Get personalize recommendations for userId

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/recommendations/A1L5P841VIO02V
```

``` Respose Example
[{
    "rekognition": "[\"Electronics\",\"Helmet\",\"Clothing\",\"Apparel\",\"Headphones\",\"Headset\"]",
    "asin": "B001T7QJ9O",
    "imUrl": "http://ecx.images-amazon.com/images/I/41bcSICIjBL._SY300_.jpg",
    "title": "Howard Leight R-01526 Impact Sport Electronic Earmuff"
}, {
    "rekognition": "[\"Leash\",\"Strap\"]",
    "asin": "B0000C50K3",
    "imUrl": "http://ecx.images-amazon.com/images/I/41xc49yiI5L._SY300_.jpg",
    "title": "Hoppe's BoreSnake Rifle Bore Cleaner (Choose Your Caliber)"
}, ...]
```

## /recommendationsitem/{itemId}
Get personalize recommendations base on item similarity

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/recommendationsitem/2094869245
```

``` Respose Example
[{
    "rekognition": "[\"Lamp\",\"Flashlight\"]",
    "asin": "B0081O93N2",
    "imUrl": "http://ecx.images-amazon.com/images/I/41IA6SXVimL._SX300_.jpg",
    "title": "NowAdvisor&reg;Q5 CREE 240 Lumen LED Bike Bicycle Headlight Torch"
}, {
    "rekognition": "[\"Handle\"]",
    "asin": "B001V57KKG",
    "imUrl": "http://ecx.images-amazon.com/images/I/412I0yDuapL._SX300_.jpg",
    "title": "Ventura Mudguard Set 26&quot;-28&quot;"
}, ...]
```

## /search?q={query}
Searching
⚠️ {query} cannot be null

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/search?q=Gun
```

``` Respose Example
[{
    "rekognition": "[\"Lock\",\"Combination Lock\"]",
    "asin": "B00004SQM9",
    "imUrl": "http://ecx.images-amazon.com/images/I/518M0N71SGL._SX300_.jpg",
    "title": "Master Lock 94DSPT 3-Digit Combination Gun Lock"
}, {
    "rekognition": "[\"Seasoning\",\"Syrup\",\"Food\",\"Ketchup\"]",
    "asin": "B0000C5398",
    "imUrl": "http://ecx.images-amazon.com/images/I/31bsl%2B1DQPL._SX300_.jpg",
    "title": "Birchwood Casey Tru - Oil Gun Stock Finish"
}, ...]
```

## /search?q={query}&u={userid}
Personalize Search
⚠️ {query} cannot be null

``` HTTP GET
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/search?q=Gun&u=A1L5P841VIO02V
```

``` Respose Example
[{
    "rekognition": "[\"Gun\",\"Weapon\",\"Weaponry\",\"Handgun\"]",
    "asin": "B0002INNYU",
    "imUrl": "http://ecx.images-amazon.com/images/I/41kOXbYLFKL._SX300_.jpg",
    "title": "Pearce Grips Gun Fits Government Model 1911 Rubber Finger Groove Insert"
}, {
    "rekognition": "[\"Vise\",\"Pump\",\"Gas Pump\",\"Machine\"]",
    "asin": "B000P4YJC6",
    "imUrl": "http://ecx.images-amazon.com/images/I/41H2beGGbZL._SY300_.jpg",
    "title": "Tipton Gun Vise"
}, ..]
```

## /clickevent
Submit Click event to kinesis for realtime recommendation

``` HTTP POST
https://jpn8qvh7ci.execute-api.us-east-1.amazonaws.com/withtag/clickevent

{
    "userID" : "AB2W04NI4OEAD",
    "itemID" : "A148SVSWKTJKU6",
    "sessionID" : "AB2W04NI4OEAD"
}
```

``` Respose Example
{
  "SequenceNumber": "49602401777761666870538776314728212113850425834150559746",
  "ShardId": "shardId-000000000000"
}
```