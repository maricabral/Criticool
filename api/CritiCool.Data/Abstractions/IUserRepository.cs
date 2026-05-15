using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions
{
    /// <summary>
    /// Represents a user repository.
    /// </summary>
    public interface IUserRepository : IGet<User>, IDelete<User>, ICreate<User>, ICreateMany<User>
    {
        /// <summary>
        /// Retrieves all users from the database.
        /// </summary>
        /// <returns>A collection of all user objects.</returns>
        Task<IEnumerable<User>> GetAllUsersAsync();

        /// <summary>
        /// Retrieves a user by their ID.
        /// </summary>
        /// <param name="email">The email of the user to retrieve.</param>
        /// <returns>The user object if found; otherwise, null.</returns>
        Task<User> GetUserByEmailAsync(string email);
    }
}
