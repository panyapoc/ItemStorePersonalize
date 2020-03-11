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
# if ! [[command -v node >/dev/null 2>&1] && [command -v npm >/dev/null 2>&1]]; then
#     echo -e "${RED}Error:${NC} To build the web UI from source, you need to install Node.JS and NPM."
#     echo "...and are recommended to do so via NVM for easy version management:"
#     echo "  Mac/Linux: https://github.com/nvm-sh/nvm"
#     echo "  Windows: https://github.com/coreybutler/nvm-windows"
#     exit 1
# fi

# Exit if any build/deploy step fails:
set -e

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

echo "CloudFormation Stack Outputs:\n"
aws cloudformation describe-stacks --stack-name $STACKNAME --query 'Stacks[0].Outputs'
echo -e "\nGo to ${CYAN}/webui/src/${NC}, Open ${CYAN}confix.tsx${NC} file and edit the following varibles."
echo -e "Set each one to its result in the CloudFormation output (see above)"
echo -e "${RED}* AnonymousPoolId${NC}"
echo -e "${RED}* StreamName${NC}"

echo -e "After finish editing ${CYAN}confix.tsx${NC} Press y to continue"
read -r -p "Continue (y/n)?" choice
case "$choice" in
    y|Y ) echo "yes";;
    n|N )
        echo "Quitting: Remember to push your web assets to S3 to enable the website"
        exit 2
        ;;
    * )
        echo -e "${RED}Invalid response${NC} '$choice' - aborting"
        exit 1
        ;;
esac

echo "Getting web bucket name from stack output..."
WEBBUCKETNAME=`aws cloudformation describe-stacks --stack-name $STACKNAME \
    --query 'Stacks[0].Outputs[?OutputKey==\`WebBucketName\`].OutputValue' \
    --profile $AWSPROFILE --region us-east-1 \
    --output text`
echo $WEBBUCKETNAME

echo "Running web UI build..."
cd webui
npm install
npm run build
cd ..

echo "Uploading web assets..."
cd webui/build
aws s3 sync . "s3://${WEBBUCKETNAME}/web" --delete --profile $AWSPROFILE
cd ../..

echo -e "${CYAN}Done!${NC}"
