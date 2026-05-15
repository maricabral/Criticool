namespace CritiCool.Infrastructure.Providers.TMDB.Services
{
    public interface IMovieDBProvider
    {
        Task<bool> SeedCritiCoolMoviesAsync(DateTime? forcedReleaseDate);
    }
}
