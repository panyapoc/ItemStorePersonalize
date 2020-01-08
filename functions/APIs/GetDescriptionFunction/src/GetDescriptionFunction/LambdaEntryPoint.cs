using System;
using Microsoft.AspNetCore.Hosting;
namespace GetDescriptionFunction
{
    public class LambdaEntryPoint : Amazon.Lambda.AspNetCoreServer.APIGatewayProxyFunction
    {
        protected override void Init(IWebHostBuilder builder) => builder.UseStartup();
    }
}
