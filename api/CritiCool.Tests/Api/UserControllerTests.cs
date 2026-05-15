using AutoFixture;
using AutoMapper;
using CritiCool.Api.Controllers;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Users;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;

namespace CritiCool.Tests.Api
{
    [TestClass]
    public class UsersControllerTests
    {
        private UsersController _userController;
        private Mock<IUserService> _userServiceMock;
        private Mock<IMapper> _mapperMock;
        private Mock<ILogger<UsersController>> _loggerMock;
        
        private IFixture _fixture;

        [TestInitialize]
        public void Initialize()
        {
            _fixture = new Fixture();

            _userServiceMock = new Mock<IUserService>();
            _mapperMock = new Mock<IMapper>();
            _loggerMock = new Mock<ILogger<UsersController>>();

            _userController = new UsersController(
                _userServiceMock.Object,
                _mapperMock.Object,
                _loggerMock.Object
            );
        }

        [TestMethod]
        public async Task GetUser_ValidIdentifier_ReturnsUser()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var userViewModel = _fixture.Create<UserViewModel>();
            _userServiceMock.Setup(x => x.GetAsync(userId)).ReturnsAsync(userViewModel);

            // Act
            var result = await _userController.GetUser(userId.ToString()) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status200OK, result.StatusCode);
            Assert.AreEqual(userViewModel, result.Value);
        }

        [TestMethod]
        public async Task GetUser_InvalidIdentifier_ReturnsNotFound()
        {
            // Arrange
            var identifier = "invalid-identifier";
            _userServiceMock.Setup(x => x.GetUserByEmailAsync(identifier)).ReturnsAsync((UserViewModel)null);

            // Act
            var result = await _userController.GetUser(identifier) as NotFoundObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status404NotFound, result.StatusCode);
            Assert.AreEqual("User not found.", result.Value);
        }

        [TestMethod]
        public async Task GetUser_ExceptionThrown_ReturnsInternalServerError()
        {
            // Arrange
            var identifier = "valid-identifier";
            _userServiceMock.Setup(x => x.GetUserByEmailAsync(identifier)).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _userController.GetUser(identifier) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }

        [TestMethod]
        public async Task CreateUser_ValidInput_Returns201Created()
        {
            // Arrange
            var createUserModel = _fixture.Create<CreateUserModel>();
            var user = _fixture.Create<User>();
            var userId = Guid.NewGuid();
            var userViewModel = _fixture.Create<UserViewModel>();

            _mapperMock.Setup(x => x.Map<User>(createUserModel)).Returns(user);
            _userServiceMock.Setup(x => x.CreateAsync(user)).ReturnsAsync(userId);
            _mapperMock.Setup(x => x.Map<UserViewModel>(user)).Returns(userViewModel);

            // Act
            var result = await _userController.CreateUser(createUserModel) as CreatedAtActionResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status201Created, result.StatusCode);
            Assert.AreEqual(nameof(UsersController.CreateUser), result.ActionName);
            Assert.AreEqual(userId, result.RouteValues["userId"]);
            Assert.AreEqual(userViewModel, result.Value);
        }

        [TestMethod]
        public async Task CreateUser_DuplicateEmail_Returns400BadRequest()
        {
            // Arrange
            var createUserModel = _fixture.Create<CreateUserModel>();
            _mapperMock.Setup(x => x.Map<User>(createUserModel)).Returns(_fixture.Create<User>());
            _userServiceMock.Setup(x => x.CreateAsync(It.IsAny<User>())).ThrowsAsync(new DuplicateEmailException("Duplicate email"));

            // Act
            var result = await _userController.CreateUser(createUserModel) as BadRequestObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status400BadRequest, result.StatusCode);
            Assert.AreEqual("Duplicate email", result.Value);
        }

        [TestMethod]
        public async Task CreateUser_ExceptionThrown_Returns500InternalServerError()
        {
            // Arrange
            var createUserModel = _fixture.Create<CreateUserModel>();
            _mapperMock.Setup(x => x.Map<User>(createUserModel)).Returns(_fixture.Create<User>());
            _userServiceMock.Setup(x => x.CreateAsync(It.IsAny<User>())).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _userController.CreateUser(createUserModel) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }

        [TestMethod]
        public async Task CreateUsers_ValidInput_Returns201Created()
        {
            // Arrange
            var createUserModels = _fixture.CreateMany<CreateUserModel>().ToList();
            var users = _fixture.CreateMany<User>().ToList();
            var userIds = users.Select(user => Guid.NewGuid()).ToList();
            var userViewModels = _fixture.CreateMany<UserViewModel>().ToList();

            _mapperMock.Setup(x => x.Map<List<User>>(createUserModels)).Returns(users);
            _userServiceMock.Setup(x => x.CreateAsync(users)).ReturnsAsync(userIds);
            _mapperMock.Setup(x => x.Map<List<UserViewModel>>(users)).Returns(userViewModels);

            // Act
            var result = await _userController.CreateUsers(createUserModels) as CreatedAtActionResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status201Created, result.StatusCode);
            Assert.AreEqual(nameof(UsersController.GetUser), result.ActionName);
            CollectionAssert.AreEqual(userIds, (List<Guid>)result.RouteValues["userIds"]);
            CollectionAssert.AreEqual(userViewModels, (List<UserViewModel>)result.Value);
        }

        [TestMethod]
        public async Task CreateUsers_DuplicateEmail_Returns400BadRequest()
        {
            // Arrange
            var createUserModels = _fixture.CreateMany<CreateUserModel>().ToList();
            _mapperMock.Setup(x => x.Map<List<User>>(createUserModels)).Returns(_fixture.CreateMany<User>().ToList());
            _userServiceMock.Setup(x => x.CreateAsync(It.IsAny<List<User>>())).ThrowsAsync(new DuplicateEmailException("Duplicate email"));

            // Act
            var result = await  _userController.CreateUsers(createUserModels) as BadRequestObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status400BadRequest, result.StatusCode);
            Assert.AreEqual("Duplicate email", result.Value);
        }

        [TestMethod]
        public async Task CreateUsers_ExceptionThrown_Returns500InternalServerError()
        {
            // Arrange
            var createUserModels = _fixture.CreateMany<CreateUserModel>().ToList();
            _mapperMock.Setup(x => x.Map<List<User>>(createUserModels)).Returns(_fixture.CreateMany<User>().ToList());
            _userServiceMock.Setup(x => x.CreateAsync(It.IsAny<List<User>>())).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _userController.CreateUsers(createUserModels) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }

        [TestMethod]
        public async Task GetAllUsersAsync_ValidData_Returns200OK()
        {
            // Arrange         
            var users = _fixture.CreateMany<UserViewModel>().ToList();

            _userServiceMock.Setup(x => x.GetAllUsersAsync()).ReturnsAsync(users);           

            // Act
            var result = await _userController.GetAllUsersAsync() as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status200OK, result.StatusCode);
            CollectionAssert.AreEqual(users, (List<UserViewModel>)result.Value);

        }

        [TestMethod]
        public async Task GetAllUsersAsync_ExceptionThrown_Returns500InternalServerError()
        {
            // Arrange
            _userServiceMock.Setup(x => x.GetAllUsersAsync()).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _userController.GetAllUsersAsync() as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }

        [TestMethod]
        public async Task DeleteUser_ValidUserId_Returns200OK()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Act
            var result = await _userController.DeleteUser(userId) as NoContentResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status204NoContent, result.StatusCode);
        }

        [TestMethod]
        public async Task DeleteUser_UserNotFoundException_Returns404NotFound()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _userServiceMock.Setup(x => x.DeleteAsync(userId)).ThrowsAsync(new UserNotFoundException("User not found"));

            // Act
            var result = await _userController.DeleteUser(userId) as NotFoundObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status404NotFound, result.StatusCode);
            Assert.AreEqual("User not found", result.Value);
        }

        [TestMethod]
        public async Task DeleteUser_ExceptionThrown_Returns500InternalServerError()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _userServiceMock.Setup(x => x.DeleteAsync(userId)).ThrowsAsync(new Exception("Simulated exception"));

            // Act
            var result = await _userController.DeleteUser(userId) as ObjectResult;

            // Assert
            Assert.IsNotNull(result);
            Assert.AreEqual(StatusCodes.Status500InternalServerError, result.StatusCode);
            Assert.AreEqual("An error occurred while processing your request.", result.Value);
        }
    }
}
