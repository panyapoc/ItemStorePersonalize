#!/bin/bash
cd venv/lib/python3.7/site-packages
zip -r9 ${OLDPWD}/updateSearchCluster.zip .
cd $OLDPWD
zip -g updateSearchCluster.zip index.py
aws lambda update-function-code --function-name updateSearchCluster --zip-file fileb://updateSearchCluster.zip
