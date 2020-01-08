using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using HtmlAgilityPack;
using ScrapySharp.Network;
using ScrapySharp.Extensions;
using System.Text.RegularExpressions;
using System.Diagnostics;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.Json.JsonSerializer))]

namespace GetDescriptionFunction
{
    public class Function
    {
        
        /// <summary>
        /// A simple function that takes a string and does a ToUpper
        /// </summary>
        /// <param name="input"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest input, ILambdaContext context)
        {
            var asin = input.QueryStringParameters["asin"];

            if (string.IsNullOrEmpty(asin))
            {
                return new APIGatewayProxyResponse { StatusCode = 200, Body = string.Empty };
            }

            // Get the HTTP
            string strUrl = $"https://www.amazon.com/dp/{asin}";

            ScrapingBrowser Browser = new ScrapingBrowser();
            Browser.AllowAutoRedirect = true; // Browser has settings you can access in setup
            Browser.AllowMetaRedirect = true;

            WebPage PageResult = Browser.NavigateToPage(new Uri(strUrl));
            var pointNodes = PageResult.Html.CssSelect("#feature-bullets li .a-list-item");

            RegexOptions options = RegexOptions.None;
            Regex regex = new Regex("[ ]{2,}", options);

            var itemText=pointNodes.Select(n => regex.Replace( n.InnerText.Replace(@"\n","")," ").Trim()).ToArray();
           
            var jsonResult=Newtonsoft.Json.JsonConvert.SerializeObject(new { Items = itemText });

            Debug.WriteLine(jsonResult);

            var response = new APIGatewayProxyResponse();
            response.Headers = new Dictionary<string, string>();
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            
            response.Headers.Add("Access-Control-Allow-Credentials","True");
            response.IsBase64Encoded = false;
            response.StatusCode = 200;
            response.Body = jsonResult;

            return response;

        }
    }
}
