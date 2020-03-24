#!/bin/bash
## deploy-webui.sh
# Fetch configuration variables from deployed CloudFormation stack, load them to a .env file, build the 
# ReactJS web app with the .env file, and sync the built web assets to the stack's `WebBucketName` S3.

STACKNAME=$1
AWSPROFILE=$2

if [ -z "$AWSPROFILE" ]
then
    echo "AWSPROFILE not provided - using default"
    AWSPROFILE=default
fi

# Colorization (needs -e switch on echo, or to use printf):
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color (end)

# Check required arguments:
if [ -z "$STACKNAME" ]
then
    echo -e "${RED}Error:${NC} First argument must be the name given to your CloudFormation stack"
    echo "(Under 12 characters, all lowercase, which will prefix created AWS resource names)"
    exit 1
fi

# Check UI build requirements:
if ! [[command -v node >/dev/null 2>&1] && [command -v npm >/dev/null 2>&1]]; then
    echo -e "${RED}Error:${NC} To build the web UI from source, you need to install Node.JS and NPM."
    echo "...and are recommended to do so via NVM for easy version management:"
    echo "  Mac/Linux: https://github.com/nvm-sh/nvm"
    echo "  Windows: https://github.com/coreybutler/nvm-windows"
    exit 1
fi

set -e

echo "Getting web bucket name from CloudFormation stack output..."
WEBBUCKETNAME=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebBucketName\`].OutputValue' \
    --profile $AWSPROFILE --region us-east-1 \
    --output text`
echo "Deploying to: $WEBBUCKETNAME"

if [ -z "$WEBBUCKETNAME" ]
then
    echo -e "${RED}Error:${NC} Could not find WebBucketName for stack '$STACKNAME'"
    exit 1
else
    echo "Will deploy to s3://$WEBBUCKETNAME/web"
fi

echo "Fetching configuration variables from CloudFormation stack output..."
ANONYMOUS_POOL_ID=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebUIAnonymousPoolId\`].OutputValue' \
    --profile $AWSPROFILE \
    --output text`
EVENT_STREAM_NAME=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebUIStreamName\`].OutputValue' \
    --profile $AWSPROFILE \
    --output text`

# Our react-scripts based npm build command will load variables defined in webui/.env to the process.env.* object in
# JavaScript at build time, through which the web UI's config.tsx file will access them:
echo "Writing configuration file to 'webui/.env'..."
cat <<EOF > webui/.env
# AUTO-GENERATED FILE FROM deploy-webui.sh - DO NOT EDIT
REACT_APP_ANONYMOUS_POOL_ID=$ANONYMOUS_POOL_ID
REACT_APP_EVENT_STREAM_NAME=$EVENT_STREAM_NAME
EOF

echo "Running web UI build..."
cd webui
npm install
npm run build
cd ..

echo "Uploading web assets..."
cd webui/build
aws s3 sync . "s3://${WEBBUCKETNAME}/web" --delete --profile $AWSPROFILE
cd ../..

echo -e "${CYAN}Web UI deployed!${NC}"
