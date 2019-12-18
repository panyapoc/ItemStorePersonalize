import boto3
import json
import os
import requests
from requests_aws4auth import AWS4Auth

region = os.environ["REGION"]
RANKING_ARN = os.environ["RANKING_ARN"]
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)
client = boto3.client('personalize-runtime')

dynamodb = boto3.resource('dynamodb')
ddb_tablename = os.environ["ddb_tablename"]
table = dynamodb.Table(ddb_tablename)

index = "items_vanilla"
type = "items"
url = "https://" + os.environ["ESENDPOINT"] + "/_search" # ElasticSearch cluster URL

# Search - Search for books across book names, authors, and categories
def handler(event, context):

    query = {
        "size": 25,
        "query": {
            "fuzzy": {
                "title": {
                    "value": event["queryStringParameters"]["q"],
                    "fuzziness": "AUTO",
                    "max_expansions": 50,
                    "prefix_length": 0,
                    "transpositions": True,
                    "rewrite": "constant_score"
                }
            }
        }
    }

    print(query)

    # ES 6.x requires an explicit Content-Type header
    headers = { "Content-Type": "application/json" }

    r = requests.get(url, auth=awsauth, headers=headers, data=json.dumps(query))

    print(r.text)
    document = json.loads(r.text)

    qresult = []
    qresultid = []
    for item in document['hits']['hits'] :
        qresult.append(item['_source'])
        qresultid.append(item['_source']['asin'])

    try :
        userId = event["queryStringParameters"]["u"]
    except :
        userId = None

    if userId is None:
        response = {
            "statusCode": r.status_code,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps(qresult)
        }
    else :
        rerank = client.get_personalized_ranking(
            campaignArn=RANKING_ARN,
            inputList=qresultid,
            userId=event["queryStringParameters"]["u"]
        )

        itemlist = [];
        errcount = 0
        for item in rerank['personalizedRanking']:
            itemobj = table.get_item(
                Key={
                    'asin': item['itemId']
                }
            )
            try :
                itemlist.append(itemobj['Item'])
            except :
                errcount = errcount+1

        print("Can't find ",errcount)


        response = {
            "statusCode": r.status_code,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps(itemlist)
        }

    return response
