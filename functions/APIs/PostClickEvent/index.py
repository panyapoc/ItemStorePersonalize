from __future__ import print_function

import os
import base64
import json
import uuid
import boto3
import time

def handler(event, context):
    #print("Received event: " + json.dumps(event, indent=2))
    print("Look Here!!!!!")
    for record in event['Records']:
        # Kinesis data is base64 encoded so decode here
        payload = base64.b64decode(record['kinesis']['data'])
        clickEvent = json.loads(payload)
        print("====clickEvent====\n",clickEvent)
        send_movie_click(clickEvent)
        print ("Post Event to Personalize Successfully")
    return 'Successfully processed {} records.'.format(len(event['Records']))

def send_movie_click(clickEvent):
    """
    Simulates a click as an envent
    to send an event to Amazon Personalize's Event Tracker
    """
    personalize_events = boto3.client(service_name='personalize-events')
    # Configure Session
    try:
        session_ID = clickEvent['sessionID']
    except:
        session_ID = str(uuid.uuid1())

    # Configure Properties:
    event = {
    "itemId": str(clickEvent['itemID']),
    }
    event_json = json.dumps(event)

    print ("**********")
    print (session_ID)

    # Make Call
    personalize_events.put_events(
        trackingId = os.environ["TRACKING_ID"],
        userId = clickEvent['userID'],
        sessionId = session_ID,
        eventList = [{
            'sentAt': int(time.time()),
            'eventType': 'EVENT_TYPE',
            'properties': event_json
        }]
    )