#!/bin/bash
BUILDFILE=templatebuild.yaml
TEMPLATEFILE=template.yaml
PACKAGEFILE=package.yaml
AWSPROFILE=default
SRCS3=panyapoc-src
STACKNAME=pocstor

sam build \
    --use-container \
    --template $TEMPLATEFILE \
    --profile $AWSPROFILE

# bucket to store the build articfact need to be create manually
sam package \
    --output-template-file $PACKAGEFILE \
    --s3-bucket $SRCS3 \
    --profile $AWSPROFILE

sam deploy \
    --template-file $PACKAGEFILE \
    --stack-name $STACKNAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile $AWSPROFILE \
    --parameter-overrides ProjectName=$STACKNAME