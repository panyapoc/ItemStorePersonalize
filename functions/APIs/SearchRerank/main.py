# Python Built-Ins:
import json
import logging
import os

# External Dependencies:
import boto3

dynamodb = boto3.resource("dynamodb")
lambdafunction = boto3.client("lambda")
personalize_runtime = boto3.client("personalize-runtime")
table = dynamodb.Table(os.environ["DDB_TABLE_NAME"])

# (Slicing with None is equivalent to no limit)
MAX_PROMOTED_RESULTS = os.environ.get("MAX_PROMOTED_RESULTS")
if MAX_PROMOTED_RESULTS is not None:
    MAX_PROMOTED_RESULTS = int(MAX_PROMOTED_RESULTS)


logger = logging.getLogger()

def handler(event, context):
    sresult = lambdafunction.invoke(
        FunctionName=os.environ["SEARCH_LAMBDA_ARN"],
        LogType="Tail",
        Payload=json.dumps(event),
    )
    res_json = json.loads(sresult["Payload"].read().decode("utf-8"))
    raw_list = res_json["body"]["result"]

    logger.info(f"Raw search results: {raw_list}")

    campaign_arn = os.environ.get("CAMPAIGN_ARN")
    response = {}
    reranked_list = []
    if campaign_arn:
        try:
            userId = event["queryStringParameters"]["u"]
        except:
            userId = None

        if userId != None and len(raw_list) != 0:
            rerank = personalize_runtime.get_personalized_ranking(
                campaignArn=campaign_arn,
                inputList=raw_list,
                userId=userId
            )
            reranked_list = [item["itemId"] for item in rerank["personalizedRanking"]]
    else:
        response["warning"] = (
            "Personalized search re-ranking has not yet been enabled: First train a re-ranking model and "
            "deploy a campaign in Amazon Personalize, then set the CAMPAIGN_ARN environment variable on "
            "your SearchRerank Lambda function to use the model on the website!"
        )

    logger.info(f"Re-ranked search results: {reranked_list}")

    # We will return up to MAX_PROMOTED_RESULTS from the re-ranked list first, followed by results from the
    # raw list:
    promotions = reranked_list[:MAX_PROMOTED_RESULTS]
    n_promotions = len(promotions)
    final_list = promotions + [id for id in raw_list if id not in promotions]
    results = []
    errcount = 0
    for i, id in enumerate(final_list):
        itemobj = table.get_item(Key={ "asin": id })
        try:
            results.append(itemobj["Item"])
            if i < n_promotions:
                itemobj["Item"]["Promoted"] = True
        except:
            errcount += 1

    if errcount:
        missingWarning = f"{errcount} item IDs missing from DynamoDB"
        logger.warning(missingWarning)
        if "warning" in response:
            response["warning"] += "\n\n" + missingWarning
        else:
            response["warning"] = missingWarning
    response["results"] = results

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Credentials": True,
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(response),
    }
