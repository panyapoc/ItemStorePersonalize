#!/bin/bash
BUILDFILE=templatebuild.yaml
TEMPLATEFILE=template.yaml
PACKAGEFILE=package.tmp.yaml
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

# Check UI build requirements:
if ! [[command -v node >/dev/null 2>&1] && [command -v npm >/dev/null 2>&1]]; then
  echo -e "${RED}Error:${NC} To build the web UI from source, you need to install Node.JS and NPM."
  echo "...and are recommended to do so via NVM for easy version management:"
  echo "  Mac/Linux: https://github.com/nvm-sh/nvm"
  echo "  Windows: https://github.com/coreybutler/nvm-windows"
  exit 1
fi

# exit when any command fails
set -e

echo "Running web UI build..."
cd webui
npm install
npm run build
cd ..

echo "Running SAM build..."
sam build \
    --use-container \
    --template $TEMPLATEFILE \
    --profile $AWSPROFILE

echo "Running SAM package..."
sam package \
    --output-template-file $PACKAGEFILE \
    --s3-bucket $SRCS3 \
    --profile $AWSPROFILE

echo "Running SAM deploy..."
sam deploy \
    --template-file $PACKAGEFILE \
    --stack-name $STACKNAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile $AWSPROFILE \
    --parameter-overrides BucketName=$SRCS3 ProjectName=$STACKNAME
        # --disable-rollback

#TODO: edit webui/src/config.tsx to point to the same API

echo "Getting web bucket name from stack output..."
WEBBUCKETNAME=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebBucketName\`].OutputValue' \
    --output text`
echo $WEBBUCKETNAME

echo "Uploading web assets..."
cd webui/build
aws s3 sync . "s3://${WEBBUCKETNAME}/web" --delete
cd ../..

echo -e "${CYAN}Done!${NC}"
