#!/bin/bash
BUILDFILE=templatebuild.yaml
TEMPLATEFILE=template.yaml
PACKAGEFILE=package.tmp.yaml

SRCS3=$1
STACKNAME=$2
AWSPROFILE=$3

if [ -z "$AWSPROFILE" ]
then
    echo "AWSPROFILE not provided - using default"
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
    echo -e "${RED}Error:${NC} Second argument must be a name to give your CloudFormation stack"
    echo "(Under 12 characters, all lowercase, which will prefix created AWS resource names)"
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

# Exit if any build/deploy step fails:
set -e

echo "Running web UI build..."
cd webui
npm install
npm run build
cd ..

echo "Staging web assets..."
cd webui/build
rm -f webui.zip
zip -r webui.zip *
aws s3 cp --profile $AWSPROFILE webui.zip "s3://${SRCS3}/webui.zip"
cd ../..

echo "Running SAM build..."
sam build \
    --use-container \
    --template $TEMPLATEFILE \
    --profile $AWSPROFILE

echo "Running SAM package..."
sam package \
    --output-template-file $PACKAGEFILE \
    --s3-bucket $SRCS3 \
    --s3-prefix sam \
    --profile $AWSPROFILE

echo "Copying final CloudFormation template to S3..."
aws s3 cp --profile $AWSPROFILE $PACKAGEFILE "s3://${SRCS3}/package.yaml"

echo "Running SAM deploy..."
sam deploy \
    --template-file $PACKAGEFILE \
    --stack-name $STACKNAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile $AWSPROFILE \
    --parameter-overrides \
        ProjectName=$STACKNAME \
        WebSource=s3://${SRCS3}/webui.zip

# NOTE: ^ Add more parameter overrides here to set other parameters in your deployed CF stack!

echo -e "${CYAN}Full stack deployed!${NC}"
