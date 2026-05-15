using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Movies;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace CritiCool.Controllers
{
    /// <summary>
    /// API controller for managing movie-related operations.
    /// </summary>
    /// <remarks>
    ///   <para>This controller provides endpoints for performing various movie-related operations, including retrieving movies information, creating users, and deleting users.</para>
    ///   <para>It handles both single user and bulk user creation, as well as user deletion.</para>
    ///   <para>Responses include 200 OK or 201 created for successful operations, 400 Bad Request for invalid data or user conflicts, 404 Not Found for resource not found, and 500 Internal Server Error for unexpected errors.</para>
    /// </remarks>
    [Route("[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly ILogger<MoviesController> _logger;
        private readonly IMovieService _movieService;

        public MoviesController(IMovieService movieService, ILogger<MoviesController> logger)
        {
            _movieService = movieService ?? throw new ArgumentNullException(nameof(movieService)); ;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Retrieves a list of movies asynchronously.
        /// </summary>
        /// <param name="page">The page number for pagination (default is 1).</param>
        /// <param name="pageSize">The number of items to display per page (default is 10).</param>
        /// <param name="search">A search query to filter movies by title (optional).</param>
        /// <param name="maxReleaseDate">A maximum release date to filter movies (optional).</param>
        /// <returns>
        ///   <para>An ActionResult containing a MovieListViewModel, representing the list of movies.</para>
        ///   <para>Returns a 200 OK status code if the request is successful.</para>
        ///   <para>Returns a 500 Internal Server Error status code if an error occurs during processing.</para>
        /// </returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(MovieListViewModel))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<MovieListViewModel>> GetAllAsync(int page = 1, int pageSize = 10, string? search = null, DateTime? maxReleaseDate = null)
        {
            try
            {
                    var skip = (page - 1) * pageSize;

                    // Get the movies and the total count
                    var (movies, totalCount) = await _movieService.GetAllMoviesAsync(skip, pageSize, search, maxReleaseDate);

                    var movieList = new MovieListViewModel(movies, page, pageSize, totalCount);                   

                    return Ok(movieList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving movies");
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal server error");
            }
        }

        /// <summary>
        /// Gets the current total count of movies.
        /// </summary>
        /// <returns>The total count of movies.</returns>
        [HttpGet("total-count")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(int))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetTotalMovieCount()
        {
            try
            {
                var totalCount = await _movieService.GetTotalMovieCountAsync();
                return Ok(totalCount);
            }
            catch(Exception ex)
            {
                _logger.LogError(ex, "An error occurred in MoviesController");
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing your request.");
            }  
        }

        /// <summary>
        /// Deletes a movie by its unique identifier.
        /// </summary>
        /// <param name="movieId">The unique identifier of the movie to delete.</param>
        /// <returns>
        ///   <para>An IActionResult indicating the result of the deletion operation.</para>
        ///   <para>Returns a 204 No Content status code if the movie is successfully deleted.</para>
        ///   <para>Returns a 404 Not Found status code if the movie with the specified ID is not found.</para>
        ///   <para>Returns a 500 Internal Server Error status code if an error occurs during processing.</para>
        /// </returns>
        [HttpDelete("{movieId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteMovie(Guid movieId)
        {
            try
            {
                await _movieService.DeleteAsync(movieId);
                return NoContent();
            }
            catch (MovieNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while deleting movie {Id}", movieId);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        // to be nuked after api stabilization 
        [HttpGet("100")]
        public async Task<ActionResult<IEnumerable<Movie>>> Get100Async()
        {
            var result = await _movieService.Get100MoviesAsync();
            return Ok(result);
        }
    }
}
