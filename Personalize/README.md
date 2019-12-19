1. Login to AWS console, go to Sagemaker to find the notebook that was deployed
2. Open the notebook instance using JupyterLab
3. Start with "1.Building_Campaign_HRNN.ipynb", then "2.Building_Campaign_P-rank.ipynb" and "3.View_Campaign_And_Interactions_jit.ipynb"

4. Campaigns ARN and Tracking ID produced by #3 will be used in the environment variables of Lambdas/API
5. (Optional) Run 5.DataLoader.ipynb to produce enriched item meta-data produced by Rekognition. Writes to DynamoDB and produces a csv which can be consumed by Personalize as item data for HRNN-Metadata
