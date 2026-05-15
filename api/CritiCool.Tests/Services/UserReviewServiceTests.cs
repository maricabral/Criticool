using AutoFixture;
using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using CritiCool.Data.Models.Entities;
using CritiCool.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;

namespace CritiCool.Tests.Services
{
    [TestClass]
    public class UserReviewServiceTests
    {
        private UserReviewService _userReviewService;

        private Mock<IUserReviewRepository> _userReviewRepositoryMock;
        private Mock<IMovieRepository> _movieRepositoryMock;
        private Mock<IUserRepository> _userRepositoryMock;
        private Mock<IReviewVotesRepository> _reviewVotesRepositoryMock;
        private Mock<ILogger<UserReviewService>> _loggerMock;

        private IFixture _fixture;

        [TestInitialize]
        public void Initialize()
        {
            _fixture = new Fixture();

            _userReviewRepositoryMock = new Mock<IUserReviewRepository>();
            _movieRepositoryMock =new Mock<IMovieRepository>();
            _userRepositoryMock =new Mock<IUserRepository>();
            _reviewVotesRepositoryMock= new Mock<IReviewVotesRepository>();

            _loggerMock = new Mock<ILogger<UserReviewService>>();
           
            _userReviewService = new UserReviewService(
                _loggerMock.Object,
                _userReviewRepositoryMock.Object,
                _movieRepositoryMock.Object,
                _userRepositoryMock.Object,
                _reviewVotesRepositoryMock.Object);
        }

        [TestMethod]
        public async Task CreateUserReviewAsync_Success()
        {
            // Arrange
            var userReview = _fixture.Create<UserReview>();
            var expectedGuid = Guid.NewGuid();

            _userReviewRepositoryMock.Setup(repo => repo.ReviewExistsAsync(userReview.UserId, userReview.MovieId))
                                        .ReturnsAsync(false);
            _movieRepositoryMock.Setup(repo => repo.GetAsync(userReview.MovieId))
                                        .ReturnsAsync(_fixture.Create<Movie>());
            _userRepositoryMock.Setup(repo => repo.GetAsync(userReview.UserId))
                                        .ReturnsAsync(_fixture.Create<User>());
            _userReviewRepositoryMock.Setup(repo => repo.CreateAsync(userReview))
                                        .ReturnsAsync(expectedGuid);

            // Act
            var result = await _userReviewService.CreateUserReviewAsync(userReview);

            // Assert
            Assert.AreEqual(expectedGuid, result);
            _userReviewRepositoryMock.Verify(repo => repo.CreateAsync(userReview), Times.Once);
        }

        [TestMethod]
        public async Task CreateUserReviewAsync_DuplicateReviewException()
        {
            // Arrange
            var userReview = _fixture.Create<UserReview>();

            _userReviewRepositoryMock.Setup(repo => repo.ReviewExistsAsync(userReview.UserId, userReview.MovieId))
                .ReturnsAsync(true);

            // Act & Assert
            await Assert.ThrowsExceptionAsync<DuplicateReviewException>(() =>
                _userReviewService.CreateUserReviewAsync(userReview));
        }

        [TestMethod]
        public async Task CreateUserReviewAsync_MovieNotFoundException()
        {
            // Arrange
            var userReview = _fixture.Create<UserReview>();

            _userReviewRepositoryMock.Setup(repo => repo.ReviewExistsAsync(userReview.UserId, userReview.MovieId))
                .ReturnsAsync(false);
            _movieRepositoryMock.Setup(repo => repo.GetAsync(userReview.MovieId))
                .ReturnsAsync((Movie)null);

            // Act & Assert
            await Assert.ThrowsExceptionAsync<MovieNotFoundException>(() =>
                _userReviewService.CreateUserReviewAsync(userReview));
        }

        [TestMethod]
        public async Task CreateUserReviewAsync_UserNotFoundException()
        {
            // Arrange
            var userReview = _fixture.Create<UserReview>();

            _userReviewRepositoryMock.Setup(repo => repo.ReviewExistsAsync(userReview.UserId, userReview.MovieId))
                .ReturnsAsync(false);
            _movieRepositoryMock.Setup(repo => repo.GetAsync(userReview.MovieId))
                .ReturnsAsync(_fixture.Create<Movie>());
            _userRepositoryMock.Setup(repo => repo.GetAsync(userReview.UserId))
                .ReturnsAsync((User)null);

            // Act & Assert
            await Assert.ThrowsExceptionAsync<UserNotFoundException>(() =>
                _userReviewService.CreateUserReviewAsync(userReview));
        }

        [TestMethod]
        [ExpectedException(typeof(Exception))]
        public async Task CreateUserReviewAsync_GeneralException()
        {
            // Arrange
            var userReview = _fixture.Create<UserReview>();
            var expectedMessage = $"Something went wrong while creating user review for movie {userReview.MovieId} made by user {userReview.UserId}";

            _userReviewRepositoryMock.Setup(repo => repo.ReviewExistsAsync(userReview.UserId, userReview.MovieId))
                .ThrowsAsync(new Exception("Test exception"));

            // Act & Assert
            await _userReviewService.CreateUserReviewAsync(userReview);
            _loggerMock.Verify(logger => logger.LogError(It.IsAny<Exception>(), expectedMessage), Times.Once);
        }
    }
}
