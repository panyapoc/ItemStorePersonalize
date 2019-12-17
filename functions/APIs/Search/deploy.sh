#!/bin/bash
cd venv/lib/python3.7/site-packages
zip -r9 ${OLDPWD}/Search.zip .
cd $OLDPWD
zip -g Search.zip index.py
aws lambda update-function-code --function-name search --zip-file fileb://Search.zip
