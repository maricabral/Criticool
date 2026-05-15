using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.Users;

namespace CritiCool.Infrastructure.Abstractions
{
    /// <summary>
    /// Service Layer for User Operations
    /// </summary>
    public interface IUserService: ICreate<User>, ICreateMany<User>, IDelete<User>
    {
        /// <summary>
        /// Retrieves a user by their ID.
        /// </summary>
        /// <param name="userId">The ID of the user to retrieve.</param>
        /// <returns>The user object if found; otherwise, null.</returns>
        Task<UserViewModel> GetAsync(Guid userId);

        /// <summary>
        /// Retrieves a user by their ID.
        /// </summary>
        /// <param name="email">The email of the user to retrieve.</param>
        /// <returns>The user object if found; otherwise, null.</returns>
        Task<UserViewModel> GetUserByEmailAsync(string email);

        /// <summary>
        /// Retrieves all users.
        /// </summary>
        /// <returns>A collection of all user objects.</returns>
        Task<IEnumerable<UserViewModel>> GetAllUsersAsync();
    }
}
