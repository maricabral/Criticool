using AutoFixture;
using AutoMapper;
using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Users;
using CritiCool.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;

namespace CritiCool.Tests.Services
{
    [TestClass]
    public class UserServiceTests
    {
        private UserService _userService;
        private Mock<IUserRepository> _userRepositoryMock;
        private Mock<IMapper> _mapperMock;
        private Mock<ILogger<UserService>> _loggerMock;

        private IFixture _fixture;

        [TestInitialize]
        public void Initialize()
        {
            _fixture = new Fixture();

            _userRepositoryMock = new Mock<IUserRepository>();
            _loggerMock = new Mock<ILogger<UserService>>();
            _mapperMock = new Mock<IMapper>();
            
            _userService = new UserService(
                _userRepositoryMock.Object, 
                _mapperMock.Object, 
                _loggerMock.Object
           );
        }

        [TestMethod]
        public async Task CreateAsync_Successful()
        {
            // Arrange
            var newUser = new User { Email = "test@example.com" };
            User badUser = null;

            // Mock the UserRepository to return null, indicating no existing user with the same email
            _userRepositoryMock.Setup(repo => repo.GetUserByEmailAsync(newUser.Email))
                              .ReturnsAsync(badUser);

            // Mock the CreateAsync method to return a new Guid when called
            var expectedUserId = Guid.NewGuid();
            _userRepositoryMock.Setup(repo => repo.CreateAsync(newUser))
                              .ReturnsAsync(expectedUserId);

            try
            {
                // Act
                var result = await _userService.CreateAsync(newUser);

                // Assert
                Assert.AreEqual(expectedUserId, result);
            }
            catch (DuplicateEmailException)
            {
                Assert.Fail("DuplicateEmailException should not be thrown in this test.");
            }
        }

        [TestMethod]
        [ExpectedException(typeof(DuplicateEmailException))]
        public async Task CreateAsync_DuplicateEmail()
        {
            // Arrange
            var existingUser = new User { Email = "existing@example.com" };
            var newUser = new User { Email = "existing@example.com" };

            // Mock the UserRepository to return an existing user with the same email
            _userRepositoryMock.Setup(repo => repo.GetUserByEmailAsync(newUser.Email))
                              .ReturnsAsync(existingUser);

            // Act
            await _userService.CreateAsync(newUser);

            // Assert
            Assert.Fail("DuplicateEmailException should have been thrown.");

        }

        [TestMethod]
        public async Task Createsync_ExceptionHandling()
        {
            // Arrange
            var newUser = new User { Email = "test@example.com" };
            User badUser = null;

            // Mock the UserRepository to throw an exception when creating the user
            _userRepositoryMock.Setup(repo => repo.GetUserByEmailAsync(newUser.Email))
                              .ReturnsAsync(badUser);
            _userRepositoryMock.Setup(repo => repo.CreateAsync(newUser))
                              .ThrowsAsync(new Exception("Simulated exception"));

            try
            {
                // Act
                await _userService.CreateAsync(newUser);

                // Assert (Exception handling)
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }

        [TestMethod]
        public async Task CreateManyAsync_Successful()
        {
            // Arrange
            var usersToCreate = new List<User>
            {
                new() { Email = "user1@example.com" },
                new() { Email = "user2@example.com" }
            };

            // Mock the UserRepository to return an empty list of existing users
            _userRepositoryMock.Setup(repo => repo.GetAllUsersAsync())
                              .ReturnsAsync([]);

            // Mock the CreateAsync method to return the list of created user IDs
            var expectedUserIds = usersToCreate.Select(u => Guid.NewGuid()).ToList();
            _userRepositoryMock.Setup(repo => repo.CreateAsync(usersToCreate))
                              .ReturnsAsync(expectedUserIds);

            try
            {
                // Act
                var result = await _userService.CreateAsync(usersToCreate);

                // Assert
                CollectionAssert.AreEqual(expectedUserIds.ToList(), result.ToList());
            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        public async Task CreateManyAsync_DuplicateEmail()
        {
            // Arrange
            var existingUser = new User { Email = "user1@example.com" };
            var usersToCreate = new List<User>
        {
            new() { Email = "user1@example.com" },
            new() { Email = "user2@example.com" }
        };

            // Mock the UserRepository to return an existing user with the same email
            _userRepositoryMock.Setup(repo => repo.GetAllUsersAsync())
                              .ReturnsAsync([existingUser]);

            try
            {
                // Act
                await _userService.CreateAsync(usersToCreate);

                // Assert (Exception handling)
                Assert.Fail("DuplicateEmailException should have been thrown.");
            }
            catch (DuplicateEmailException)
            {
                // Test passed if DuplicateEmailException was thrown
            }
        }

        [TestMethod]
        public async Task CreateAsync_ExceptionHandling()
        {
            // Arrange
            var usersToCreate = new List<User>
        {
            new() { Email = "user1@example.com" },
            new() { Email = "user2@example.com" }
        };

            // Mock the UserRepository to throw an exception when creating users
            _userRepositoryMock.Setup(repo => repo.GetAllUsersAsync())
                              .ReturnsAsync([]);
            _userRepositoryMock.Setup(repo => repo.CreateAsync(usersToCreate))
                              .ThrowsAsync(new Exception("Simulated exception"));

            try
            {
                // Act
                await _userService.CreateAsync(usersToCreate);

                // Assert (Exception handling)
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }


        [TestMethod]
        public async Task GetAsync_Successful()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var user = _fixture.Build<User>().With(u => u.Id, userId).Create();
            var expectedUserViewModel = _fixture.Build<UserViewModel>()
                                                .With(u => u.Id, userId)
                                                .With(u => u.Email, user.Email).Create();

            // Mock the UserRepository to return the user when GetAsync is called
            _userRepositoryMock.Setup(repo => repo.GetAsync(userId))
                              .ReturnsAsync(user);

            _mapperMock.Setup(m => m.Map<UserViewModel>(user)).Returns(expectedUserViewModel);

            try
            {
                // Act
                var result = await _userService.GetAsync(userId);

                // Assert
                Assert.AreEqual(expectedUserViewModel.Id, result.Id);
                Assert.AreEqual(expectedUserViewModel.Email, result.Email);
                Assert.IsTrue(result.FirstName.Length > 0);
                Assert.IsTrue(result.LastName.Length > 0);

            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        public async Task GetAsync_ExceptionHandling()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Mock the UserRepository to throw an exception when GetAsync is called
            _userRepositoryMock.Setup(repo => repo.GetAsync(userId))
                              .ThrowsAsync(new Exception("Simulated exception"));

            try
            {
                // Act
                await _userService.GetAsync(userId);

                // Assert (Exception handling)
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }

        [TestMethod]
        public async Task GetUserByEmailAsync_Successful()
        {
            // Arrange
            var email = "test@example.com";
            var user = _fixture.Build<User>().With(u => u.Email, email).Create();
            var expectedUserViewModel = _fixture.Build<UserViewModel>()
                                                .With(u => u.Id, user.Id)
                                                .With(u => u.Email, user.Email).Create();

            // Mock the UserRepository to return the user when GetUserByEmailAsync is called
            _userRepositoryMock.Setup(repo => repo.GetUserByEmailAsync(email))
                              .ReturnsAsync(user);

            // Mock the mapper to return the expected UserViewModel
            _mapperMock.Setup(mapper => mapper.Map<UserViewModel>(user))
                       .Returns(expectedUserViewModel);

            try
            {
                // Act
                var result = await _userService.GetUserByEmailAsync(email);

                // Assert
                Assert.AreEqual(expectedUserViewModel, result);
            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        public async Task GetUserByEmailAsync_ExceptionHandling()
        {
            // Arrange
            var email = "test@example.com";

            // Mock the UserRepository to throw an exception when GetUserByEmailAsync is called
            _userRepositoryMock.Setup(repo => repo.GetUserByEmailAsync(email))
                              .ThrowsAsync(new Exception("Simulated exception"));

            try
            {
                // Act
                await _userService.GetUserByEmailAsync(email);

                // Assert (Exception handling)
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }

        [TestMethod]
        public async Task GetAllUsersAsync_Successful()
        {
            // Arrange
            var users = new List<User>
            {
                new() { Id = Guid.NewGuid(), Email = "test1@example.com" },
                new() { Id = Guid.NewGuid(), Email = "test2@example.com" },
            };

            // Mock the UserRepository to return the list of users when GetAllUsersAsync is called
            _userRepositoryMock.Setup(repo => repo.GetAllUsersAsync())
                              .ReturnsAsync(users);

            // Mock the mapper to return a UserViewModel for each user
            _mapperMock.Setup(mapper => mapper.Map<UserViewModel>(It.IsAny<User>()))
                       .Returns(_fixture.Create<UserViewModel>());

            try
            {
                // Act
                var result = await _userService.GetAllUsersAsync();

                // Assert
                Assert.AreEqual(users.Count, result.Count());
               
            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        public async Task GetAllUsersAsync_ExceptionHandling()
        {
            // Mock the UserRepository to throw an exception when GetAllUsersAsync is called
            _userRepositoryMock.Setup(repo => repo.GetAllUsersAsync())
                              .ThrowsAsync(new Exception("Simulated exception"));
            try
            {
                // Act
                await _userService.GetAllUsersAsync();

                // Assert (Exception handling)
                Assert.Fail("Exception should have been propagated.");
            }
            catch (Exception ex)
            {
                // Test passed if an exception was thrown
                Assert.AreEqual("Simulated exception", ex.Message);
            }
        }

        [TestMethod]
        public async Task DeleteAsync_Successful()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var userToDelete = new User { Id = userId };

            // Mock the UserRepository to return the user when GetAsync is called
            _userRepositoryMock.Setup(repo => repo.GetAsync(userId))
                              .ReturnsAsync(userToDelete);

            try
            {
                // Act
                await _userService.DeleteAsync(userId);

                // Assert (Verify that DeleteAsync was called with the correct user ID)
                _userRepositoryMock.Verify(repo => repo.DeleteAsync(userId), Times.Once);
            }
            catch (Exception)
            {
                Assert.Fail("No exception should be thrown in this test.");
            }
        }

        [TestMethod]
        [ExpectedException(typeof(UserNotFoundException))]
        public async Task DeleteAsync_UserNotFound()
        {
            // Arrange
            var userId = Guid.NewGuid();
            User badUser = null;

            // Mock the UserRepository to return null, indicating that the user does not exist
            _userRepositoryMock.Setup(repo => repo.GetAsync(userId))
                              .ReturnsAsync(badUser);

            // Act
            await _userService.DeleteAsync(userId);

            // Assert (Exception handling)
            Assert.Fail("UserNotFoundException should have been thrown.");

        }

        [TestMethod]
        public async Task DeleteAsync_ExceptionHandling()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Mock the UserRepository to throw an exception when deleting the user
            _userRepositoryMock.Setup(repo => repo.GetAsync(userId))
                              .ThrowsAsync(new Exception("Simulated exception"));

            try
            {
                // Act
                await _userService.DeleteAsync(userId);

                // Assert (Exception handling)
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
