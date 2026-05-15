using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using CritiCool.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json;
using System.Net;

namespace CritiCool.Tests.Data
{
    [TestClass]
    public class ExceptionMiddlewareTests
    {
        [TestMethod]
        public async Task Invoke_WithNoException_ReturnsStatusCode200()
        {
            // Arrange
            var middleware = new ExceptionMiddleware((context) => Task.CompletedTask);
            var context = new DefaultHttpContext();
            context.Response.Body = new MemoryStream();

            // Act
            await middleware.Invoke(context);

            // Assert
            Assert.AreEqual((int)HttpStatusCode.OK, context.Response.StatusCode);
        }

        [TestMethod]
        public async Task Invoke_WithUserNotFoundException_ReturnsStatusCode404()
        {
            // Arrange
            var builder = new WebHostBuilder()
                .ConfigureServices(services => { })
                .Configure(app =>
                {
                    app.UseMiddleware<ExceptionMiddleware>();
                    app.Run(context =>
                    {
                        throw new UserNotFoundException("User not found");
                    });
                });

            var server = new TestServer(builder);
            var client = server.CreateClient();

            // Act
            var response = await client.GetAsync("/");

            // Assert
            Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeAnonymousType(responseContent, new { StatusCode = 0, Message = "" });
            Assert.AreEqual(HttpStatusCode.NotFound, (HttpStatusCode)responseObject.StatusCode);
            Assert.AreEqual("User not found", responseObject.Message);
        }

        [TestMethod]
        public async Task Invoke_WithUserReviewNotFoundException_ReturnsStatusCode404()
        {
            // Arrange
            var builder = new WebHostBuilder()
                .ConfigureServices(services => { })
                .Configure(app =>
                {
                    app.UseMiddleware<ExceptionMiddleware>();
                    app.Run(context =>
                    {
                        throw new UserReviewNotFoundException("User Review not found");
                    });
                });

            var server = new TestServer(builder);
            var client = server.CreateClient();

            // Act
            var response = await client.GetAsync("/");

            // Assert
            Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeAnonymousType(responseContent, new { StatusCode = 0, Message = "" });
            Assert.AreEqual(HttpStatusCode.NotFound, (HttpStatusCode)responseObject.StatusCode);
            Assert.AreEqual("User Review not found", responseObject.Message);
        }


        [TestMethod]
        public async Task Invoke_WithMovieNotFoundException_ReturnsStatusCode404()
        {
            // Arrange
            var builder = new WebHostBuilder()
                .ConfigureServices(services => { })
                .Configure(app =>
                {
                    app.UseMiddleware<ExceptionMiddleware>();
                    app.Run(context =>
                    {
                        throw new MovieNotFoundException("Movie not found");
                    });
                });

            var server = new TestServer(builder);
            var client = server.CreateClient();

            // Act
            var response = await client.GetAsync("/");

            // Assert
            Assert.AreEqual(HttpStatusCode.NotFound, response.StatusCode);

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeAnonymousType(responseContent, new { StatusCode = 0, Message = "" });
            Assert.AreEqual(HttpStatusCode.NotFound, (HttpStatusCode)responseObject.StatusCode);
            Assert.AreEqual("Movie not found", responseObject.Message);
        }

        [TestMethod]
        public async Task Invoke_WithDuplicateEmailException_ReturnsStatusCode400()
        {
            // Arrange
            var builder = new WebHostBuilder()
                .ConfigureServices(services => { })
                .Configure(app =>
                {
                    app.UseMiddleware<ExceptionMiddleware>();
                    app.Run(context =>
                    {
                        throw new DuplicateEmailException("Email already exists");
                    });
                });

            var server = new TestServer(builder);
            var client = server.CreateClient();

            // Act
            var response = await client.GetAsync("/");

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeAnonymousType(responseContent, new { StatusCode = 0, Message = "" });
            Assert.AreEqual(HttpStatusCode.BadRequest, (HttpStatusCode)responseObject.StatusCode);
            Assert.AreEqual("Email already exists", responseObject.Message);
        }

        [TestMethod]
        public async Task Invoke_WithDuplicateReviewException_ReturnsStatusCode400()
        {
            // Arrange
            var builder = new WebHostBuilder()
                .ConfigureServices(services => { })
                .Configure(app =>
                {
                    app.UseMiddleware<ExceptionMiddleware>();
                    app.Run(context =>
                    {
                        throw new DuplicateReviewException("Review already exists");
                    });
                });

            var server = new TestServer(builder);
            var client = server.CreateClient();

            // Act
            var response = await client.GetAsync("/");

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);

            var responseContent = await response.Content.ReadAsStringAsync();
            var responseObject = JsonConvert.DeserializeAnonymousType(responseContent, new { StatusCode = 0, Message = "" });
            Assert.AreEqual(HttpStatusCode.BadRequest, (HttpStatusCode)responseObject.StatusCode);
            Assert.AreEqual("Review already exists", responseObject.Message);
        }

    }
}
