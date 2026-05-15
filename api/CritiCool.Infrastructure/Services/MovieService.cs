using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Models.Entities;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.Extensions.Logging;
using static CritiCool.Infrastructure.Extentions.DateExtensions;

namespace CritiCool.Infrastructure.Services
{
    public class MovieService(IMovieRepository movieRepository, ILogger<MovieService> logger) : IMovieService
    {
        private readonly ILogger<MovieService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        private readonly IMovieRepository _movieRepository = movieRepository ?? throw new ArgumentNullException(nameof(movieRepository));

        /// <inheritdoc />
        public async Task<int> GetTotalMovieCountAsync()
        {
            try
            {
                return await _movieRepository.GetTotalMovieCountAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving movie count.");
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<(IEnumerable<Movie> Movies, int TotalCount)> GetAllMoviesAsync(int skip, int take, string? search, DateTime? maxReleaseDate)
        {
            try
            {
                maxReleaseDate = maxReleaseDate ?? DateTime.Now;
                search= search ?? string.Empty;

                var (movies, totalCount) = await _movieRepository.GetAllMoviesAsync(skip, take, search, maxReleaseDate.ToReleaseString());
                return (movies, totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving movies");
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<Movie> GetAsync(Guid movieId)
        {
            try
            {
                var movie = await _movieRepository.GetAsync(movieId);

                if (movie == null)
                {
                    throw new MovieNotFoundException("Movie not found.");
                }
                return movie;
            }
            catch (Exception ex) when (!(ex is MovieNotFoundException))
            {
                _logger.LogError(ex, "Something went wrong while retrieving movie {Id}", movieId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid movieId)
        {
            try
            {
                var movieToDelete = await _movieRepository.GetAsync(movieId);
                if (movieToDelete == null)
                {
                    throw new MovieNotFoundException("Movie not found for deletion.");
                }

                await _movieRepository.DeleteAsync(movieId);
            }
            catch (Exception ex) when (!(ex is MovieNotFoundException))
            {
                _logger.LogError(ex, "Something went wrong while deleting movie {Id}", movieId);
                throw;
            }
        }

        // to be deleted in future
        public async Task<IEnumerable<Movie>> Get100MoviesAsync()
        {
            try
            {
                var result = await _movieRepository.GetLast100MoviesAsync();
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving movies");
                throw;
            }
        }
    }
}
