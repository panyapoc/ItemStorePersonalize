# Personalize Demo Notebooks

## Instructions

Once your CloudFormation stack has deployed, a SageMaker Notebook Instance will have been created and pre-loaded with this repository.

Find the instance in the [SageMaker](https://console.aws.amazon.com/sagemaker/home) section of the AWS Console and click "Open JupyterLab" to get started, then browse to this folder and follow the notebooks through in order.


## Clean-Up

Be aware that these notebooks create (chargeable) resources **outside of your CloudFormation stack**: So deleting the stack in CloudFormation will not completely clear your environment.

To avoid ongoing charges, be sure to clear up all created resources (campaigns, solutions, datasets, dataset groups, etc) via the [**Amazon Personalize console**](https://console.aws.amazon.com/personalize/home) when you're done experimenting!
