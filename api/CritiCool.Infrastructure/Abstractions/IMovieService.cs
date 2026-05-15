using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;

namespace CritiCool.Infrastructure.Abstractions
{
    /// <summary>
    /// Service Layer for Movie Operations
    /// </summary>
    public interface IMovieService : IGet<Movie>, IDelete<Movie>
    {
        /// <summary>
        /// Retrieves the current total count of movies.
        /// </summary>
        /// <returns>The total count of movies.</returns>
        Task<int> GetTotalMovieCountAsync();

        /// <summary>
        /// Retrieves a list of movies based on specified criteria, including pagination, search terms, and maximum release date.
        /// </summary>
        /// <param name="skip">The number of records to skip from the beginning of the result set.</param>
        /// <param name="take">The maximum number of records to retrieve.</param>
        /// <param name="search">An optional search term to filter movies by title or other criteria.</param>
        /// <param name="maxReleaseDate">An optional maximum release date to filter movies by.</param>
        /// <returns>
        /// A tuple containing:
        /// - An enumerable collection of <see cref="Movie"/> objects that match the criteria.
        /// - An integer representing the total count of movies that match the criteria before pagination.
        /// </returns>
        /// <remarks>
        /// This method allows you to retrieve a subset of movies from a larger dataset, applying optional search criteria and a maximum release date filter.
        /// </remarks>
        /// <exception cref="Exception">Thrown when an error occurs while retrieving movies.</exception>
        Task<(IEnumerable<Movie> Movies, int TotalCount)> GetAllMoviesAsync(int skip, int take, string? search, DateTime? maxReleaseDate);
        
        Task<IEnumerable<Movie>> Get100MoviesAsync();
    }
}
