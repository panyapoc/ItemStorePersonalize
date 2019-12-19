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

RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$SRCS3" ]
then
    echo "source s3 bucket is empty, pls enter source s3 bucket"
elif [ -z "$STACKNAME" ]
then
    echo "STACKNAME is empty, pls make sure you enter the STACKNAME"
else
    echo "[${RED}${AWSPROFILE}${NC}]"
    echo "using ${RED}${SRCS3}${NC} as a source s3 bucket"
    echo "Start Deploying using these parameter\nSRCS3=${SRCS3}\nAWSPROFILE=${AWSPROFILE}\nSTACKNAME=${STACKNAME}"
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
            # --disable-rollback

fi