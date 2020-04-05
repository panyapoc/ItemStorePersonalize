# Python Built-Ins:
import json
import os

# External Dependencies:
import boto3

personalize = boto3.client("personalize")
personalize_runtime = boto3.client("personalize-runtime")
dynamodb = boto3.resource("dynamodb")
ddb_tablename = os.environ["ddb_tablename"]
table = dynamodb.Table(ddb_tablename)

def handler(event, context):
    # "arn:aws:personalize:us-east-1:387269085412:campaign/personalize-demo-camp"
    Campaign_ARN = os.environ["Campaign_ARN"]
    try :
        itemId = event['pathParameters'].get("itemid", "NoItemId")
    except :
        itemId = "NoItemId"
    response = personalize_runtime.get_recommendations(
        campaignArn = Campaign_ARN,
        itemId = itemId
    )

    itemlist = [];
    errcount = 0
    for item in response['itemList']:
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


    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": True
        },
        'body': json.dumps(itemlist)
    }
