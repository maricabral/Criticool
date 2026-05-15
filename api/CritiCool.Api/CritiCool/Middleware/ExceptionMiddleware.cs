using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using Newtonsoft.Json;
using System.Net;

namespace CritiCool.Middleware
{
    public class ExceptionMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            string message;
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            switch (exception)
            {
                case UserNotFoundException:
                case UserReviewNotFoundException:
                case MovieNotFoundException:
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    message = exception.Message;
                    break;

                case DuplicateEmailException:
                case DuplicateReviewException:
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    message = exception.Message;
                    break;

                default:
                    context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                    message = "An error occurred while processing your request."; 
                    break;
            }

            var response = new
            {
                StatusCode = context.Response.StatusCode,
                Message = message
            };

            return context.Response.WriteAsync(JsonConvert.SerializeObject(response));
        }
    }
}
