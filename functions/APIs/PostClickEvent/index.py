from __future__ import print_function

import base64
import json
import uuid
import boto3
import time

def lambda_handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    print("Look Here!!!!!")
    for record in event['Records']:
        # Kinesis data is base64 encoded so decode here
        payload = base64.b64decode(record['kinesis']['data'])
        clickEvent = json.loads (payload)
        send_movie_click(clickEvent['userID'], clickEvent['userID'])
        print ("Post Event to Personalize Successfully")
    return 'Successfully processed {} records.'.format(len(event['Records']))

def send_movie_click(USER_ID, ITEM_ID):
    """
    Simulates a click as an envent
    to send an event to Amazon Personalize's Event Tracker
    """
    personalize_events = boto3.client(service_name='personalize-events')
    session_dict = {}
    # Configure Session
    try:
        session_ID = session_dict[USER_ID]
    except:
        session_dict[USER_ID] = str(uuid.uuid1())
        session_ID = session_dict[USER_ID]

    # Configure Properties:
    event = {
    "itemId": str(ITEM_ID),
    }
    event_json = json.dumps(event)

    # Make Call
    personalize_events.put_events(
    trackingId = "8b1ce80f-3c86-4924-aaeb-f4a7bb992a53",
    userId= USER_ID,
    sessionId = session_ID,
    eventList = [{
        'sentAt': int(time.time()),
        'eventType': 'EVENT_TYPE',
        'properties': event_json
        }]
    )