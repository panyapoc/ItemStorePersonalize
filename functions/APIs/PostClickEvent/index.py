import base64
import json
import uuid
import boto3
import time
import os
personalize_events = boto3.client(service_name='personalize-events')

def handler(event, context):
    for record in event['Records']:
        # Kinesis data is base64 encoded so decode here
        payload = base64.b64decode(record['kinesis']['data'])
        clickEvent = json.loads (payload)
        print ('clickEvent: ',clickEvent)
        send_clickEvent(clickEvent)
        print ("Post Event to Personalize Successfully")

        return "Post Event to Personalize Successfully"


def send_clickEvent(clickEvent):
    try:
        session_ID = clickEvent['sessionID']
        if session_ID ==  None:
            session_ID = str(uuid.uuid1())
    except:
        session_ID = str(uuid.uuid1())

    event = {
        "itemId": str(clickEvent['itemID']),
    }
    event_json = json.dumps(event)

    print ("SID ",session_ID)

    # Make Call
    response = personalize_events.put_events(
        trackingId = os.environ["TRACKING_ID"],
        userId= clickEvent['userID'],
        sessionId = session_ID,
        eventList = [{
        'sentAt': int(time.time()),
        'eventType': 'EVENT_TYPE',
        'properties': event_json
        }]
    )