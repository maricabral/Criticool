using AutoMapper;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Users;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace CritiCool.Api.Controllers
{
    /// <summary>
    /// API controller for managing user-related operations.
    /// </summary>
    /// <remarks>
    ///   <para>This controller provides endpoints for performing various user-related operations, including retrieving user information, creating users, and deleting users.</para>
    ///   <para>It handles both single user and bulk user creation, as well as user deletion.</para>
    ///   <para>Responses include 200 OK or 201 created for successful operations, 400 Bad Request for invalid data or user conflicts, 404 Not Found for resource not found, and 500 Internal Server Error for unexpected errors.</para>
    /// </remarks>
    [Route("[controller]")]
    [ApiController]
    public class UsersController(IUserService userService, IMapper mapper, ILogger<UsersController> logger) : ControllerBase
    {
        private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        private readonly IMapper _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        private readonly ILogger<UsersController> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        /// <summary>
        /// Retrieves a user by their identifier, which can be either a user ID or an email address.
        /// </summary>
        /// <param name="identifier">The user's identifier (either user ID or email address).</param>
        /// <returns>
        ///   <para>Returns a 200 OK response with the user information if the user is found.</para>
        ///   <para>Returns a 404 Not Found response if the user is not found.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method first attempts to retrieve a user by their user ID, and if that fails, it tries to retrieve the user by their email address.</para>
        ///   <para>If the user is not found, a 404 response is returned with an appropriate message.</para>
        ///   <para>If any unexpected error occurs, it is logged, and a 500 response is returned with an error message.</para>
        /// </remarks>
        [HttpGet("{identifier}")]
        [ProducesResponseType(typeof(UserViewModel), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetUser(string identifier)
        {
            try
            {
                UserViewModel user = new();

                if (Guid.TryParse(identifier, out Guid userId))
                {
                    user = await _userService.GetAsync(userId);
                }
                else
                {
                    user = await _userService.GetUserByEmailAsync(identifier);
                }

                if (user == null)
                {
                    return NotFound("User not found.");
                }

                return Ok(user);
            }
            catch (UserNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while retrieving user {Identifier}", identifier);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Retrieves a list of all users asynchronously.
        /// </summary>
        /// <returns>
        ///   <para>Returns a 200 OK response with a list of user information if the operation is successful.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method asynchronously fetches a list of all users from the underlying data source.</para>
        ///   <para>If the operation succeeds, it returns a 200 response with the list of users.</para>
        ///   <para>If any unexpected error occurs during the operation, it is logged, and a 500 response is returned with an error message.</para>
        /// </remarks>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UserViewModel>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAllUsersAsync()
        {
            try
            {
                var users = await _userService.GetAllUsersAsync();              
                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while retrieving users");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Creates a new user based on the provided user model.
        /// </summary>
        /// <param name="createUserModel">The model containing user information to be created.</param>
        /// <returns>
        ///   <para>Returns a 201 Created response with the newly created user information if the operation is successful.</para>
        ///   <para>Returns a 400 Bad Request response if the provided data is invalid or a user with the same email already exists.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method attempts to create a new user using the provided user model.</para>
        ///   <para>If the operation succeeds, it returns a 201 response with the newly created user's information.</para>
        ///   <para>If the provided data is invalid or a user with the same email already exists, it returns a 400 response with an appropriate error message.</para>
        ///   <para>If any unexpected error occurs during the operation, it is logged, and a 500 response is returned with an error message.</para>
        /// </remarks>
        [HttpPost]
        [ProducesResponseType(typeof(UserViewModel), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserModel createUserModel)
        {
            try
            {
                var user = _mapper.Map<User>(createUserModel);
                var userId = await _userService.CreateAsync(user);
                var mappedUserViewModel = _mapper.Map<UserViewModel>(user);

                return CreatedAtAction(nameof(CreateUser), new { userId }, mappedUserViewModel);
            }
            catch (DuplicateEmailException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while creating user {Email}", createUserModel.Email);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Creates multiple users based on the provided user models in bulk.
        /// </summary>
        /// <param name="createUserModel">A list of user models containing user information to be created.</param>
        /// <returns>
        ///   <para>Returns a 201 Created response with the newly created users' information if the operation is successful.</para>
        ///   <para>Returns a 400 Bad Request response if the provided data is invalid or if duplicate email addresses are detected.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method attempts to create multiple users in bulk using the provided user models.</para>
        ///   <para>If the operation succeeds, it returns a 201 response with the newly created users' information.</para>
        ///   <para>If the provided data is invalid or if duplicate email addresses are detected, it returns a 400 response with an appropriate error message.</para>
        ///   <para>If any unexpected error occurs during the operation, it is logged, and a 500 response is returned with an error message.</para>
        /// </remarks>
        [HttpPost("Bulk")]
        [ProducesResponseType(typeof(List<UserViewModel>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateUsers([FromBody] List<CreateUserModel> createUserModel)
        {
            try
            {
                var users = _mapper.Map<List<User>>(createUserModel);
                var userIds = await _userService.CreateAsync(users);
                var mappedUsersViewModel = _mapper.Map<List<UserViewModel>>(users);

                return CreatedAtAction(nameof(GetUser), new { userIds }, mappedUsersViewModel);
            }
            catch (DuplicateEmailException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while creating users");
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Deletes a user with the specified user ID.
        /// </summary>
        /// <param name="userId">The unique identifier of the user to delete.</param>
        /// <returns>
        ///   <para>Returns a 200 OK response if the user is successfully deleted.</para>
        ///   <para>Returns a 400 Bad Request response if there is an issue with the user deletion operation.</para>
        ///   <para>Returns a 404 Not Found response if the user with the specified ID is not found.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method attempts to delete a user with the specified user ID.</para>
        ///   <para>If the user is successfully deleted, it returns a 200 OK response.</para>
        ///   <para>If there is an issue with the user deletion operation, it returns a 400 response with an appropriate error message.</para>
        ///   <para>If the user with the specified ID is not found, it returns a 404 response with an appropriate error message.</para>
        ///   <para>If any unexpected error occurs during the operation, it is logged, and a 500 response is returned with an error message.</para>
        /// </remarks>
        [HttpDelete("{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteUser(Guid userId)
        {
            try
            {
                await _userService.DeleteAsync(userId);
                return NoContent();
            }
            catch (UserNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while deleting user {Id}", userId);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }
    }
}
