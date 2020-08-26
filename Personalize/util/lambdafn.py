import boto3

lambdaclient = boto3.client("lambda")

def update_lambda_envvar(lambda_arn, variable, value):
    """Update a single environment variable on a single Lambda Function"""
    print(f"Configuring Lambda:\n{lambda_arn}")

    # Fetch the current configuration:
    lambda_details = lambdaclient.get_function(FunctionName=lambda_arn)

    # Override the one environment variable we want to update:
    Environment = lambda_details["Configuration"]["Environment"]
    print(
        "Updating {}: {} -> {}".format(
            variable,
            Environment["Variables"].get(variable, '[Unset]'),
            value
        )
    )
    Environment["Variables"][variable] = value
    print(Environment)

    response = lambdaclient.update_function_configuration(
        FunctionName=lambda_arn,
        Environment=Environment,
    )
    print("Done!")
    return response
