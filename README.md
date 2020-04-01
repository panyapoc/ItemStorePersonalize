# "AllStore" Amazon Personalize Demo

A demo solution (and associated workshop Python notebooks in SageMaker) for product recommendations with 
[Amazon Personalize](https://aws.amazon.com/personalize/).

* See https://allstore.cloud/ for a running version, or
* Deploy the stack in your own account with the button below, or
* Read on to customize and build the components from source!

[![Launch Stack](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://us-east-1.console.aws.amazon.com/cloudformation/home#/stacks/new?stackName=AllStoreDemo&templateURL=https://public-personalize-demo-assets-us-east-1.s3.amazonaws.com/package.yaml)

## Solution Architecture

![alt text](ReadmeImg/AllStore-Architect.png "Architecture Diagram")

### Initial Setup

The CloudFormation stack deployment will automatically load initial product data from the S3 file you
specify into DynamoDB (and, since they're connected via a stream, update Elasticsearch).

## Folder Structure

```Tree
├── Personalize                                    [DataPipeline Notebook]
│   ├── 1.Building_Campaign_HRNN.ipynb
│   ├── 2.Building_Campaign_SIMS.ipynb
│   ├── 3.Building_Campaign_P-rank.ipynb
│   ├── 4.View_Campaign_And_Interactions_jit.ipynb
│   ├── Data Loader.ipynb
│   └── Datasets
│       ├── allstore-ratings.csv
│       ├── convertcsv.csv
│       ├── items_w_Metadata.csv
│       ├── ratings.csv
│       └── users.csv
├── data                                            [Raw data Repo]
├── deploy-webui.sh                                 [UI-only deployment script (for UI updates)]
├── deploy.sh                                       [Deployment script (full stack)]
├── functions                                       [Lambda Fuction Repo]
│   ├── APIs                                        [API Lamdba Fuction Repo]
│   │   ├── GetItem                                 [Get item details]
│   │   ├── GetItemDescription                      [Get product description from Amz API]
│   │   ├── GetRecommendations                      [Get recommended items for a user]
│   │   ├── GetRecommendationsByItem                [Get recommended items by item]
│   │   ├── ListItems                               [List available items]
│   │   ├── PostClickEvent                          [Notify the model of a click event]
│   │   ├── Search                                  [Search for items by text]
│   │   ├── SearchRerank                            [Re-rank search results for the user]
│   │   └── Session                                 [Initialise a session (return stack params)]
│   ├── setup                                       [Setup Lambda Fuction]
│   └── streaming                                   [Streaming Lambda Fuction]
│       └── UpdateSearchCluster
├── template.yaml                                   [SAM Cloudformation Template]
└── webui                                           [Store user interface]
```

## Custom Build Prerequisites

In order to build and deploy this stack, you'll need:

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

### Step 2: Post-deployment setup

1. Goto [Personalize](/Personalize) to start Creating Campaign
2. Once the Campaign is deploy go to the following fuction
    * Rerank
    * GetRecommendations
    * GetRecommendationsByItem
3. In the environment section and replace the ARN with the one create from jupyter notebook.
4. Goto ``/webui/src/``, Open [confix.tsx](/webui/src/index.tsx) file and edit the following varible. These varible can be found in cloudformation output.
    * Apitree
    * AnonymousPoolId
    * StreamName

**Note:** Personalize SIMS solution will perform much better with HPO than as configured by default.

## API

### /items/{id}

Get item by item id ([ASIN](https://www.amazon.com/gp/seller/asin-upc-isbn-info.html))

**HTTP GET**
```
https://${Apitree}/${StageName}/items/B00004NKIQ
```

**Response Example**
```json
{
    "rekognition": "[\"Crib\",\"Furniture\",\"Fence\"]",
    "asin": "B00004NKIQ",
    "imUrl": "http://ecx.images-amazon.com/images/I/515sDhGh5aL._SY300_.jpg",
    "title": "Franklin Sports Adjustable Soccer Rebounder (6-Feet by 4-Feet)"
}
```

### /recommendations

Get item recommendations anonymously

**HTTP GET**
```
https://${Apitree}/${StageName}/recommendations/
```

**Response Example**
```json
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

### /recommendations/{userId}

Get personalize recommendations for userId

**HTTP GET**
```
https://${Apitree}/${StageName}/recommendations/${UserID}

https://${Apitree}/${StageName}/recommendations/A1L5P841VIO02V
```

**Response Example**
```json
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

### /recommendationsitem/{itemId}

Get personalize recommendations base on item similarity

**HTTP GET**
```
https://${Apitree}/${StageName}/recommendationsitem/${ItemID}

https://${Apitree}/${StageName}/recommendationsitem/2094869245
```

**Response Example**
```json
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

### /search?q={query}

Search for products by text query

⚠️ `query` cannot be null

**HTTP GET**
```
https://${Apitree}/${StageName}/search?q=${querytext}

https://${Apitree}/${StageName}/search?q=Gun
```

**Response Example**
```json
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

### /search?q={query}&u={userid}

User-personalized for products by text query

⚠️ `query` cannot be null

**HTTP GET**
```
https://${Apitree}/${StageName}/search?q=${querytext}&u=${UserID}

https://${Apitree}/${StageName}/search?q=Gun&u=A1L5P841VIO02V
```

**Response Example**
```json
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

### /session

Start a "session" (in reality, just fetching CloudFormation output params to configure the UI)

**HTTP GET**
```
https://${Apitree}/${StageName}/session
```

**Response Example**
```json
{
    "AnonymousPoolId": "us-east-1:c394e25c-63e8-4f39-9e62-123456ff123f",
    "StreamName": "allstore-Clickstream"
}
```
