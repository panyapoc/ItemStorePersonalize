# Python Built-Ins:
import json
import os

# External Dependencies:
import boto3

personalize_runtime = boto3.client("personalize-runtime")
lambdafunction = boto3.client("lambda")
dynamodb = boto3.resource("dynamodb")

RANKING_ARN = os.environ["RANKING_ARN"]
SEARCH_ARN = os.environ["SEARCH_ARN"]
table = dynamodb.Table(os.environ["DDB_TABLE"])

def handler(event, context):
    sresult = lambdafunction.invoke(
        FunctionName=SEARCH_ARN,
        LogType='Tail',
        Payload=json.dumps(event),
    )
    res_json = json.loads(sresult['Payload'].read().decode("utf-8"))
    res_list = res_json['body']['result']

    print("Before list: ",res_list)

    try :
        userId = event["queryStringParameters"]["u"]
    except :
        userId = None

    if userId != None and len(res_list) != 0:
        rerank = personalize_runtime.get_personalized_ranking(
            campaignArn=RANKING_ARN,
            inputList=res_list,
            userId=userId
        )
        res_list = []

        # print(rerank)
        for item in rerank['personalizedRanking'] :
            res_list.append(item['itemId'])


    print("After list: ",res_list)

    result = []
    for id in res_list:
        itemobj = table.get_item(
            Key={
                    'asin': id
                }
            )
        try :
            result.append(itemobj['Item'])
        except :
            errcount = errcount+1

    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": True
        },
        "body": json.dumps(result)
    }

    return response