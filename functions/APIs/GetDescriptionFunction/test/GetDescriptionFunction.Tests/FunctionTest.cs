using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Xunit;
using Amazon.Lambda.Core;
using Amazon.Lambda.TestUtilities;

using GetDescriptionFunction;
using System.Diagnostics;

namespace GetDescriptionFunction.Tests
{
    public class FunctionTest
    {
        [Fact]
        public void TestGetDescription()
        {

            // Invoke the lambda function and confirm the string was upper cased.
            var function = new Function();
            var context = new TestLambdaContext();
           var request= new Amazon.Lambda.APIGatewayEvents.APIGatewayProxyRequest();
            var querystring= new Dictionary<string, string>();
            querystring.Add("asin", "B000NOQIOU");
            request.QueryStringParameters = querystring;
            var response = function.FunctionHandler(request , context);
            Debug.WriteLine(response.Body);
            Assert.NotEmpty(response.Body);
        }
    }
}
