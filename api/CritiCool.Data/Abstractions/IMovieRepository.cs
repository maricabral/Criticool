using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions
{
    /// <summary>
    /// Represents a movie repository.
    /// </summary>
    public interface IMovieRepository : IGet<Movie>, ICreate<Movie>, ICreateMany<Movie>, IDelete<Movie>
    {
        /// <summary>
        /// Retrieves a collection of all movies.
        /// </summary>
        /// <returns>A collection of all Movie objects.</returns>
        Task<(IEnumerable<Movie> Movies, int TotalCount)> GetAllMoviesAsync(int skip, int take, string search, string maxReleaseDate);

        /// <summary>
        /// Retrieves the last 100 movies added to the collection.
        /// </summary>
        /// <returns>A collection of the last 100 Movie objects.</returns>
        Task<IEnumerable<Movie>> GetLast100MoviesAsync();

        /// <summary>
        /// Retrieves a collection of all unique provider IDs associated with movies.
        /// </summary>
        /// <returns>A collection of all Provider ID objects.</returns>
        Task<IEnumerable<int>> GetAllProviderIdsAsync();

        /// <summary>
        /// Retrieves the latest release date among all movies.
        /// </summary>
        /// <returns>The latest release date as a string.</returns>
        Task<string> GetLatestReleaseDate();

        /// <summary>
        /// Retrieves the current total count of movies.
        /// </summary>
        /// <returns>The total count of movies.</returns>
        Task<int> GetTotalMovieCountAsync();
    }
}
