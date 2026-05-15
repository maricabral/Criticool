using AutoFixture;
using CritiCool.Controllers;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Movies;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;

namespace CritiCool.Tests.Api
{
    [TestClass]
    public class MoviesControllerTests
    {
        private MoviesController _moviesController;
        private Mock<IMovieService> _movieServiceMock;
        private Mock<ILogger<MoviesController>> _loggerMock;

        private IFixture _fixture;

        [TestInitialize]
        public void Initialize()
        {
            _fixture = new Fixture();

            _movieServiceMock = new Mock<IMovieService>();
            _loggerMock = new Mock<ILogger<MoviesController>>();
            _moviesController = new MoviesController(
                _movieServiceMock.Object,
                _loggerMock.Object
            );
        }

        [TestMethod]
        public async Task GetAllAsync_ShouldReturnOK_WithMovieListViewModel()
        {
            // Arrange
            var page = _fixture.Create<int>();
            var pageSize = _fixture.Create<int>();
            var search = _fixture.Create<string>();
            var maxReleaseDate = _fixture.Create<DateTime>();

            var skip = (page - 1) * pageSize;

            var movies = _fixture.CreateMany<Movie>().ToList();
            var totalCount = movies.Count;

            _movieServiceMock.Setup(service => service.GetAllMoviesAsync(skip, pageSize, search, maxReleaseDate))
                .ReturnsAsync((movies, totalCount));

            // Act
            var result = await _moviesController.GetAllAsync(page, pageSize, search, maxReleaseDate);

            // Assert
            var okResult = (OkObjectResult)result.Result;
            Assert.IsNotNull(okResult);
            Assert.AreEqual(StatusCodes.Status200OK, okResult.StatusCode);

            var movieListViewModel = okResult.Value as MovieListViewModel;
            Assert.IsNotNull(movieListViewModel);
            Assert.AreEqual(movies.Count, movieListViewModel.Movies.Count());
            Assert.AreEqual(page, movieListViewModel.CurrentPage);
        }

        [TestMethod]
        public async Task GetAllAsync_ShouldReturn_InternalServerErrorOnException()
        {
            // Arrange
            _movieServiceMock.Setup(service => service.GetAllMoviesAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateTime?>()))
                .ThrowsAsync(new Exception("Test exception"));

            // Act
            var result = await _moviesController.GetAllAsync(1, 10, null, null);

            // Assert
            var statusCodeResult = (ObjectResult)result.Result;
            Assert.IsNotNull(statusCodeResult);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, statusCodeResult.StatusCode);
        }

        [TestMethod]
        public async Task GetTotalMovieCount_ValidData_ReturnsOk()
        {
            // Arrange
            int totalCount = 10;
            _movieServiceMock.Setup(service => service.GetTotalMovieCountAsync())
                .ReturnsAsync(totalCount);

            // Act
            var result = await _moviesController.GetTotalMovieCount();

            // Assert
            Assert.IsNotNull(result);
            Assert.IsInstanceOfType(result, typeof(OkObjectResult));

            var okResult = (OkObjectResult)result;
            Assert.AreEqual(totalCount, (int)okResult.Value);
        }

        [TestMethod]
        public async Task GetTotalMovieCount_MovieServiceException_ReturnsInternalServerError()
        {
            // Arrange
            _movieServiceMock.Setup(service => service.GetTotalMovieCountAsync())
                .ThrowsAsync(new Exception("Internal error."));

            // Act
            var result = await _moviesController.GetTotalMovieCount();

            // Assert
            Assert.IsNotNull(result);
            Assert.IsInstanceOfType(result, typeof(ObjectResult));
            Assert.AreEqual(StatusCodes.Status500InternalServerError, ((ObjectResult)result).StatusCode);
        }

        [TestMethod]
        public async Task DeleteMovie_ValidmovieId_Returns200OK()
        {
            // Arrange
            var movieId = Guid.NewGuid();

            // Act
            var result = await _moviesController.DeleteMovie(movieId) as NoContentResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status204NoContent, result.StatusCode);
        }

        [TestMethod]
        public async Task DeleteMovie_MovieNotFoundException_Returns404NotFound()
        {
            // Arrange
            var movieId = Guid.NewGuid();
            _movieServiceMock.Setup(x => x.DeleteAsync(movieId)).ThrowsAsync(new MovieNotFoundException("Movie not found"));

            // Act
            var result = await _moviesController.DeleteMovie(movieId) as NotFoundObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status404NotFound, result.StatusCode);
            Assert.AreEqual("Movie not found", result.Value);
        }

        [TestMethod]
        public async Task DeleteMovie_ExceptionThrown_Returns500InternalServerError()
        {
            // Arrange
            var movieId = Guid.NewGuid();
            _movieServiceMock.Setup(x => x.DeleteAsync(movieId)).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _moviesController.DeleteMovie(movieId) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }
    }
}
