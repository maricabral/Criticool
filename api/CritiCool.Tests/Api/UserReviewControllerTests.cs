using AutoFixture;
using AutoMapper;
using CritiCool.Controllers;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.UserReview;
using CritiCool.Helpers;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;

namespace CritiCool.Tests.Api
{
    [TestClass]
    public class UserReviewControllerTests
    {
        private UserReviewController _controller;

        private Mock<IUserReviewService> _userReviewServiceMock;
        private Mock<ILogger<UserReviewController>> _loggerMock;
        private Mock<IMapper> _mapperMock;

        private Fixture _fixture;


        [TestInitialize]
        public void Initialize()
        {
            _userReviewServiceMock = new Mock<IUserReviewService>();
            _loggerMock = new Mock<ILogger<UserReviewController>>();
            _fixture = new Fixture();
            _mapperMock = new Mock<IMapper>();

            var mapperConfig = new MapperConfiguration(cfg =>
            {
                cfg.AddProfile<MappingProfile>();
            });

            var mapper = mapperConfig.CreateMapper();
            _mapperMock.Setup(m => m.Map<UserReview>(It.IsAny<CreateUserReviewViewModel>()))
            .Returns((CreateUserReviewViewModel viewModel) => mapper.Map<UserReview>(viewModel));

            _controller = new UserReviewController(
                _userReviewServiceMock.Object,
                _mapperMock.Object, 
                _loggerMock.Object);
           
        }

        [TestMethod]
        public async Task CreateUserReview_ValidModel_Returns201Created()
        {
            // Arrange
            var createUserReviewModel = _fixture.Create<CreateUserReviewViewModel>();
            var userReview = _fixture.Create<UserReview>();
            var reviewId = Guid.NewGuid();

            _userReviewServiceMock.Setup(service => service.CreateUserReviewAsync(It.IsAny<UserReview>()))
                .ReturnsAsync(reviewId);

            // Act
            var result = await _controller.CreateUserReview(createUserReviewModel) as CreatedAtActionResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status201Created, result.StatusCode);
            Assert.AreEqual(nameof(UserReviewController.CreateUserReview), result.ActionName);
            Assert.AreEqual(reviewId, result.RouteValues["reviewId"]);
        }

        [TestMethod]
        public async Task CreateUserReview_DuplicateReviewException_ReturnsConflict()
        {
            // Arrange
            var createUserReviewModel = _fixture.Create<CreateUserReviewViewModel>();
            var duplicateReviewExceptionMessage = "Review already exists"; // Replace with the expected exception message
            _userReviewServiceMock.Setup(service => service.CreateUserReviewAsync(It.IsAny<UserReview>()))
                .ThrowsAsync(new DuplicateReviewException(duplicateReviewExceptionMessage));

            // Act
            var result = await _controller.CreateUserReview(createUserReviewModel) as ConflictObjectResult;

            // Assert
            Assert.AreEqual(StatusCodes.Status409Conflict, result.StatusCode);
            Assert.AreEqual(duplicateReviewExceptionMessage, result.Value);
        }

        [TestMethod]
        public async Task CreateUserReview_MovieNotFoundException_ReturnsNotFound()
        {
            // Arrange
            var createUserReviewModel = _fixture.Create<CreateUserReviewViewModel>();
            var movieNotFoundExceptionMessage = "Movie not found"; // Replace with the expected exception message
            _userReviewServiceMock.Setup(service => service.CreateUserReviewAsync(It.IsAny<UserReview>()))
                .ThrowsAsync(new MovieNotFoundException(movieNotFoundExceptionMessage));

            // Act
            var result = await _controller.CreateUserReview(createUserReviewModel) as NotFoundObjectResult;

            // Assert
            Assert.AreEqual(StatusCodes.Status404NotFound, result.StatusCode);
            Assert.AreEqual(movieNotFoundExceptionMessage, result.Value);
        }

        [TestMethod]
        public async Task CreateUserReview_UserNotFoundException_ReturnsNotFound()
        {
            // Arrange
            var createUserReviewModel = _fixture.Create<CreateUserReviewViewModel>();
            var userNotFoundExceptionMessage = "User not found"; // Replace with the expected exception message
            _userReviewServiceMock.Setup(service => service.CreateUserReviewAsync(It.IsAny<UserReview>()))
                .ThrowsAsync(new UserNotFoundException(userNotFoundExceptionMessage));

            // Act
            var result = await _controller.CreateUserReview(createUserReviewModel) as NotFoundObjectResult;

            // Assert
            Assert.AreEqual(StatusCodes.Status404NotFound, result.StatusCode);
            Assert.AreEqual(userNotFoundExceptionMessage, result.Value);
        }

        [TestMethod]
        public async Task CreateUserReview_GeneralException_ReturnsInternalServerError()
        {
            // Arrange
            var createUserReviewModel = _fixture.Create<CreateUserReviewViewModel>();
            var generalExceptionMessage = "An unexpected error occurred"; // Replace with the expected exception message
            _userReviewServiceMock.Setup(service => service.CreateUserReviewAsync(It.IsAny<UserReview>()))
                .ThrowsAsync(new Exception(generalExceptionMessage));

            // Act
            var result = await _controller.CreateUserReview(createUserReviewModel) as ObjectResult;

            // Assert
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }
    }
}
