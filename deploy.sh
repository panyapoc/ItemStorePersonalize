#!/bin/bash
BUILDFILE=templatebuild.yaml
TEMPLATEFILE=template.yaml
PACKAGEFILE=package.yaml
AWSPROFILE=default

SRCS3=$1
STACKNAME=$2
AWSPROFILE=$3

if [ -z "$AWSPROFILE" ]
then
    # echo "AWSPROFILE is empty"
    AWSPROFILE=default
fi

# Colorization (needs -e switch on echo, or to use printf):
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color (end)

if [ -z "$SRCS3" ]
then
    echo -e "${RED}Error:${NC} First argument must be an S3 bucket name to build to and deploy from"
    echo "(You must create / select a bucket you have access to as a prerequisite)"
    exit 1
elif [ -z "$STACKNAME" ]
then
    echo -e "${RED}Error:${NC} Second argument must be an S3 bucket name to build to and deploy from"
    echo "(You must create / select a bucket you have access to as a prerequisite)"
    echo "STACKNAME is empty, pls make sure you enter the STACKNAME"
    exit 1
fi

echo -e "Using '${CYAN}${AWSPROFILE}${NC}' as AWS profile"
echo -e "Using '${CYAN}${SRCS3}${NC}' as source s3 bucket"
echo -e "Using '${CYAN}${STACKNAME}${NC}' as CloudFormation stack name"

# exit when any command fails
set -e

echo "Running sam build..."
sam build \
    --use-container \
    --template $TEMPLATEFILE \
    --profile $AWSPROFILE

echo "Running sam package..."
sam package \
    --output-template-file $PACKAGEFILE \
    --s3-bucket $SRCS3 \
    --profile $AWSPROFILE

echo "Running sam deploy..."
sam deploy \
    --template-file $PACKAGEFILE \
    --stack-name $STACKNAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile $AWSPROFILE \
    --parameter-overrides ProjectName=$STACKNAME
        # --disable-rollback
