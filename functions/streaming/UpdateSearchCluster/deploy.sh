#!/bin/bash
cd venv/lib/python3.7/site-packages
zip -r9 ${OLDPWD}/function_setup.zip .
cd $OLDPWD
zip -g function_setup.zip index.py
aws lambda update-function-code --function-name updateSearchCluster --zip-file fileb://function_setup.zip
