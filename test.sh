#!/bin/bash
AWSPROFILE=howto
SRCS3=panyapoc-testsrc
STACKNAME=teststr
echo "Getting web bucket name from stack output..."
WEBBUCKETNAME=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebBucketName\`].OutputValue' \
    --profile $AWSPROFILE --region us-east-1 \
    --output text `
echo $WEBBUCKETNAME