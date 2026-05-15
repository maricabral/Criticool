using AutoFixture;
using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Models.Entities;
using CritiCool.Infrastructure.Abstractions;
using CritiCool.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using static CritiCool.Infrastructure.Extentions.DateExtensions;

namespace CritiCool.Tests.Services
{
    [TestClass]
    public class MovieServiceTests
    {
        private MovieService _movieService;
        private Mock<IMovieRepository> _movieRepositoryMock;
        private Mock<ILogger<MovieService>> _loggerMock;

        private IFixture _fixture;

        [TestInitialize]
        public void Initialize()
        {
            _fixture = new Fixture();

            _movieRepositoryMock = new Mock<IMovieRepository>();
            _loggerMock = new Mock<ILogger<MovieService>>();
            
            _movieService = new MovieService(
                _movieRepositoryMock.Object, 
                _loggerMock.Object);            
        }

        [TestMethod] 
        public async Task GetAllMoviesAsync_ShouldReturnMovies_AndTotalCount()
        {
            // Arrange
            var skip = 0;
            var take = 10;

            var search = _fixture.Create<string>();
            var maxReleaseDate = _fixture.Create<DateTime?>();
            var movies = _fixture.CreateMany<Movie>().ToList();
            var totalCount = movies.Count;

            _movieRepositoryMock.Setup(repo => repo.GetAllMoviesAsync(skip, take, search, maxReleaseDate.ToReleaseString()))
                .ReturnsAsync((movies, totalCount));

            // Act
            var (resultMovies, resultTotalCount) = await _movieService.GetAllMoviesAsync(skip, take, search, maxReleaseDate);

            // Assert
            Assert.AreEqual(totalCount, resultTotalCount);
            CollectionAssert.AreEqual(movies, resultMovies.ToList());
        }

        [TestMethod]
        [ExpectedException(typeof(Exception))]
        public async Task GetAllMoviesAsync_ShouldLogException_AndRethrow()
        {
            // Arrange
            var skip = 0;
            var take = 10;

            // Use AutoFixture to generate test data
            var search = _fixture.Create<string>();
            var maxReleaseDate = _fixture.Create<DateTime?>();

            _movieRepositoryMock.Setup(repo => repo.GetAllMoviesAsync(skip, take, search, maxReleaseDate.ToReleaseString()))
                .ThrowsAsync(new Exception("Test exception"));

            // Act & Assert
            var result =  await _movieService.GetAllMoviesAsync(skip, take, search, maxReleaseDate);

            _loggerMock.Verify(logger => logger.LogError(It.IsAny<Exception>(), "Something went wrong while retrieving movies"), Times.Once);
        }

        [TestMethod]
        public async Task GetTotalMovieCountAsync_ValidData_ReturnsCount()
        {
            // Arrange
            int totalCount = 10;
            _movieRepositoryMock.Setup(repository => repository.GetTotalMovieCountAsync())
                .ReturnsAsync(totalCount);

            // Act
            var result = await _movieService.GetTotalMovieCountAsync();

            // Assert
            Assert.AreEqual(totalCount, result);
        }

        [TestMethod]
        [ExpectedException(typeof(Exception))]
        public async Task GetTotalMovieCountAsync_RepositoryThrowsUnexpectedException_ThrowsMovieServiceException()
        {
            // Arrange
            _movieRepositoryMock.Setup(repository => repository.GetTotalMovieCountAsync())
                .ThrowsAsync(new Exception("Unexpected error."));

            // Act
            await _movieService.GetTotalMovieCountAsync();

            // Assert
            // -> Expect Excpetion
        }

        [TestMethod]
        public async Task DeleteAsync_Successful()
        {
            // Arrange
            var movieId = Guid.NewGuid();
            var MovieToDelete = new Movie { Id = movieId };

            _movieRepositoryMock.Setup(repo => repo.GetAsync(movieId))
                              .ReturnsAsync(MovieToDelete);
            try
            {
                // Act
                await _movieService.DeleteAsync(movieId);
                _movieRepositoryMock.Verify(repo => repo.DeleteAsync(movieId), Times.Once);
            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        [ExpectedException(typeof(MovieNotFoundException))]
        public async Task DeleteAsync_MovieNotFound()
        {
            // Arrange
            var movieId = Guid.NewGuid();
            Movie badMovie = null;

            _movieRepositoryMock.Setup(repo => repo.GetAsync(movieId))
                              .ReturnsAsync(badMovie);

            // Act
            await _movieService.DeleteAsync(movieId);

            // Assert (Exception handling)
            Assert.Fail("MovieNotFoundException should have been thrown.");

        }

        [TestMethod]
        public async Task DeleteAsync_ExceptionHandling()
        {
            // Arrange
            var movieId = Guid.NewGuid();

            _movieRepositoryMock.Setup(repo => repo.GetAsync(movieId))
                              .ThrowsAsync(new Exception("Simulated exception"));
            try
            {
                // Act
                await _movieService.DeleteAsync(movieId);
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }
    }
}
