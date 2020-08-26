# Python Built-Ins:
import json
import logging
import os

# External Dependencies:
import boto3

dynamodb = boto3.resource("dynamodb")
personalize_runtime = boto3.client("personalize-runtime")
table = dynamodb.Table(os.environ["DDB_TABLE_NAME"])

logger = logging.getLogger()

def handler(event, context):
    campaign_arn = os.environ.get("CAMPAIGN_ARN")
    response = {}
    if campaign_arn:
        try:
            userId = event["pathParameters"]["userid"]
        except:
            userId = "NoUserID"
        recs = personalize_runtime.get_recommendations(
            campaignArn = campaign_arn,
            userId = userId,
        )

        itemlist = []
        errcount = 0
        for item in recs["itemList"]:
            itemobj = table.get_item(Key={ "asin": item["itemId"] })
            try:
                itemlist.append(itemobj["Item"])
            except:
                errcount += 1
        response["results"] = itemlist
        if errcount:
            response["warning"] = f"{errcount} item IDs missing from DynamoDB"
            logger.warning(response["warning"])
    else:
        response["results"] = []
        response["warning"] = (
            "Product recommendations have not yet been enabled: First train a model and deploy a campaign "
            "in Amazon Personalize, then set the CAMPAIGN_ARN environment variable on your "
            "GetRecommendations Lambda function to use the model on the website!"
        )
        try:
            # May as well try to just present *some* products - we'll take whatever a DynamoDB scan gives us:
            scan = table.scan(Limit=30)
            response["results"] = scan["Items"]
            response["warning"] += "\n\nResults shown here are a simple DynamoDB scan."
        except:
            response["results"] = []

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Credentials": True,
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(response),
    }
