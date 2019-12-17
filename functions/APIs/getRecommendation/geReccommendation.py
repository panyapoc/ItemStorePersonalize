import json
import boto3
import os

personalize = boto3.client('personalize')
personalize_runtime = boto3.client('personalize-runtime')
dynamodb = boto3.resource('dynamodb')
ddb_tablename = os.environ["ddb_tablename"]
table = dynamodb.Table(ddb_tablename)

def lambda_handler(event, context):
    Campaign_ARN = "arn:aws:personalize:us-east-1:387269085412:campaign/personalize-demo-camp"

    try :
        userId = event['pathParameters'].get("userId", "NoUserID")
    except :
        userId = "NoUserID"
    response = personalize_runtime.get_recommendations(
        campaignArn = Campaign_ARN,
        userId = userId
    )

    itemlist = [];
    for item in response['itemList']:
        itemobj = table.get_item(
            Key={
                'asin': item['itemId']
            }
        )
        itemlist.append(itemobj['Item'])

    return {
        'statusCode': 200,
        'body': json.dumps(itemlist)
    }
