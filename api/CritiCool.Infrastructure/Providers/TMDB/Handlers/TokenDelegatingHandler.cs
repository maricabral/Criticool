using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;

namespace CritiCool.Infrastructure.Providers.TMDB.Handlers
{
    /// <summary>
    /// Token Handler class, class that adds authorization tokens for requests
    /// </summary>
    public class TokenDelegatingHandler(IConfiguration configuration) : DelegatingHandler
    {
        private readonly string _accessToken = configuration["TMDB:AccessToken"]
            ?? throw new InvalidOperationException("TMDB:AccessToken is not configured.");

        /// <summary>
        /// Sends a delegated httprequest
        /// </summary>
        /// <returns> Returns the original request with token Header.</returns>
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            // If authorization header is missing, add it to the request
            if (request.Headers.Authorization is null)
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
            }

            var response = await base.SendAsync(request, cancellationToken);
            return response;
        }
    }
}
