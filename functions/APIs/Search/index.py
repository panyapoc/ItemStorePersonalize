import boto3
import json
import os
import requests
from requests_aws4auth import AWS4Auth

region = os.environ["REGION"]
service = "es"
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

index = "items_vanilla"
type = "items"
url = "https://" + os.environ["ESENDPOINT"] + "/_search" # ElasticSearch cluster URL

# Search - Search for books across book names, authors, and categories
def handler(event, context):

    # Put the user query into the query DSL for more accurate search results.
    query = {
        "size": 25,
        "query": {
            "multi_match": {
                "query": event["queryStringParameters"]["q"],
                "fields": ["asin", "title"]
            }
        }
    }
    print(query)

    # ES 6.x requires an explicit Content-Type header
    headers = { "Content-Type": "application/json" }

    r = requests.get(url, auth=awsauth, headers=headers, data=json.dumps(query))

    print(r.text)
    document = json.loads(r.text)

    result = []
    for item in document['hits']['hits'] :
        result.append(item['_source'])

    # Create the response and add some extra content to support CORS
    response = {
        "statusCode": r.status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": True
        },
        "body": json.dumps(result)
    }

    return response
