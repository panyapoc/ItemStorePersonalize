# ItemStore

## Folder Structure

``` Tree
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
├── deploy.sh                                       [Deployment Script]
├── functions                                       [Lambda Fuction Repo]
│   ├── APIs                                        [API Lamdba Fuction Repo]
│   │   ├── GetDescriptionFunction                  [Get product description from Amz API]
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
├── template.yaml                                   [SAM Cloudformation Template]
└── webui                                           [Store user interface]
```

## Deployment Prerequisites

In order to deploy this stack, you'll need:

### Installed on your machine

1. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html) pointed to your target account and region with `aws configure`
1. [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
1. [Docker Desktop](https://www.docker.com/products/docker-desktop)
1. Tools to build the Web UI front end from source:
    * [NodeJS v12](https://nodejs.org/en/download/) (You may wish to install Node via the **Node Version Manager** for [Mac/Linux](https://github.com/nvm-sh/nvm#installing-and-updating) or [Windows](https://github.com/coreybutler/nvm-windows#node-version-manager-nvm-for-windows)).
    * If you see Web UI build errors relating to an incompatible version of [Python](https://www.python.org/), you may need to install additional versions of Python via [pyenv](https://github.com/pyenv/pyenv#simple-python-version-management-pyenv) (recommended), [conda](https://docs.conda.io/en/latest/), or any other Python environment management tool of your choice.

### On the AWS cloud

1. Access (and [access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)) to an AWS Account, with sufficient permissions to create all the required resources.
2. An S3 Bucket to package the source code to, in the same AWS region as you expect to deploy.
3. Created a service linked role for ES, as below in AWS CLI:

``` bash
aws iam create-service-linked-role \
--aws-service-name es.amazonaws.com \
--description "My service-linked role to Amazon ElasticSearch"
```

## Deployment

### Step 1: Build and deploy the stack

Run the deployment script, with parameters as follows:

``` bash
sh deploy.sh <s3bucketname> <stackname> <AWSprofile (optional)>
```

* `s3bucketname` - The S3 bucket you've already created, for storing built source code (Lambda functions, etc.)
* `stackname` - The name to give the CloudFormation Stack ⚠️ must be up to 12 lower case letters ⚠️
* `AWSprofile` (Optional) - The API profile name, otherwise SAM will use the default profile

This script will:

* Build the web front end assets (locally) from ReactJS source code
* Build required Lambda functions in Docker via AWS SAM, and upload these packages to your S3 bucket
* Deploy the solution stack CloudFormation template via AWS SAM
* Upload the web front end assets to the web hosting bucket created in the solution stack.

This may take up to and over an hour to complete, mostly on the deployment of infrastructure-intensive resources such as the ElasticSearch domain and CloudFront distribution.

## Step 2: Post-deployment setup

1. Goto [Personalize](/Personalize) to start Creating Campaign
2. Once the Campaign is deploy go to the following fuction
    * Rerank
    * GetRecommendations
    * GetRecommendationsByItem
3. In the environment section and replace the ARN with the one create from jupyter notebook.
4. Goto ``/webui``, Open config.tsx file and edit the following varible
    * Apitree
    * AnonymousPoolId
    * StreamName

# API doc

API Document

## /items/{id}

Get item by item id (asin)

``` HTTP GET
https://${Apitree}/withtag/items/B00004NKIQ
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
https://${Apitree}/withtag/recommendations/
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
https://${Apitree}/withtag/recommendations/A1L5P841VIO02V
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
https://${Apitree}/withtag/recommendationsitem/2094869245
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
https://${Apitree}/withtag/search?q=Gun
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
https://${Apitree}/withtag/search?q=Gun&u=A1L5P841VIO02V
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
