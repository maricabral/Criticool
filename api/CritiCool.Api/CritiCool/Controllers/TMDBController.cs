using CritiCool.Infrastructure.Providers.TMDB.Services;
using Microsoft.AspNetCore.Mvc;

namespace CritiCool.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class TMDBController(IMovieDBProvider movieDBProvider) : ControllerBase
    {
        IMovieDBProvider _movieDBProvider = movieDBProvider;

        [HttpPost("Seed/{forcedDate?}")]
        public async Task<bool> SeedMovieDatabase(DateTime? forcedDate)
        {
            var result = await _movieDBProvider.SeedCritiCoolMoviesAsync(forcedDate);
            return result;
        }
    }
}
