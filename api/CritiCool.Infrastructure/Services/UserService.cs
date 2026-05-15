using AutoMapper;
using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Users;
using CritiCool.Infrastructure.Abstractions;
using CritiCool.Infrastructure.Extentions;
using Microsoft.Extensions.Logging;

namespace CritiCool.Infrastructure.Services
{
    public class UserService(IUserRepository userRepository, IMapper mapper, ILogger<UserService> logger) : IUserService
    {
        private readonly ILogger<UserService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        private readonly IMapper _mapper = mapper;
        private readonly IUserRepository _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));

        /// <inheritdoc />
        public async Task<Guid> CreateAsync(User user)
        {
            try
            {
                // Check for duplicate email and handle accordingly
                var existingUser = await _userRepository.GetUserByEmailAsync(user.Email);
                if (existingUser != null)
                {
                    throw new DuplicateEmailException("Email address already exists.");
                }

                return await _userRepository.CreateAsync(user);
            }
            catch (Exception ex) when (!(ex is DuplicateEmailException))
            {
                _logger.LogError(ex, "Something went wrong while creating user with email {Email}", user.Email);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Guid>> CreateAsync(List<User> users)
        {
            try
            {
                var allUsers = await _userRepository.GetAllUsersAsync();
                var allEmails = allUsers.Select(x => x.Email);

                // Check for duplicate email and handle accordingly               
                if (users.Any(e => allEmails.Contains(e.Email)))
                {
                    throw new DuplicateEmailException("One or more users already exists");
                }

                return await _userRepository.CreateAsync(users);
            }
            catch (Exception ex) when (!(ex is DuplicateEmailException))
            {
                _logger.LogError(ex, "Something went wrong while creating users");
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<UserViewModel> GetAsync(Guid userId)
        {
            try
            {
                var user = await _userRepository.GetAsync(userId);

                if (user == null)
                {
                    throw new UserNotFoundException("User not found.");
                }

                var userViewModel = GenerateUserName(user);
                return userViewModel;
            }
            catch (Exception ex) when (!(ex is UserNotFoundException))
            {
                _logger.LogError(ex, "Something went wrong while retrieving user {Id}", userId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<UserViewModel> GetUserByEmailAsync(string email)
        {
            try
            {
                var user = await _userRepository.GetUserByEmailAsync(email);
                var userViewModel = GenerateUserName(user);
                return userViewModel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving user with email {Id}", email);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<IEnumerable<UserViewModel>> GetAllUsersAsync()
        {
            try
            {
                var users = await _userRepository.GetAllUsersAsync();
                return users.Select(GenerateUserName).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving users");
                throw;
            }
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid userId)
        {
            try
            {
                var userToDelete = await _userRepository.GetAsync(userId);
                if (userToDelete == null)
                {
                    throw new UserNotFoundException("User not found for deletion.");
                }

                await _userRepository.DeleteAsync(userId);
            }
            catch (Exception ex) when (!(ex is UserNotFoundException))
            {
                _logger.LogError(ex, "Something went wrong while deleting user {Id}", userId);
                throw;
            }
        }


        // to be deleted after Auth0 Integration
        private UserViewModel GenerateUserName(User user)
        {
            string firstName, lastName;

            if(user.Email.Contains("guba", StringComparison.CurrentCultureIgnoreCase))
            {
                firstName = "Guba";
                lastName = "Chociay";
            }

            else if(user.Email.Contains("choci", StringComparison.CurrentCultureIgnoreCase))
            {
                firstName = "Lucas";
                lastName = "Chociay";
            }

            else
            {
                firstName = RandomNameGenerator.GenerateRandomFirstName();
                lastName = RandomNameGenerator.GenerateRandomLastName();
            }

            var userView = _mapper.Map<UserViewModel>(user);

            userView.FirstName = firstName;
            userView.LastName = lastName;

            return userView;
        }
    }
}
