using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Entities;
using Dapper;

namespace CritiCool.Data.Repositories
{
    public class UserRepository(string connectionStrings) : BaseRepository(connectionStrings), IUserRepository
    {

        /// <inheritdoc />
        public async Task<Guid> CreateAsync(User entity)
        {
            var sql = @"INSERT INTO Users (Id, Email, ProviderId, ProviderName, DateCreated, DateUpdated)
                             VALUES (@Id, @Email, @ProviderId, @ProviderName, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, entity);
            return entity.Id;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Guid>> CreateAsync(List<User> entities)
        {
            var sql = @"INSERT INTO Users (Id, Email, ProviderId, ProviderName, DateCreated, DateUpdated)
                VALUES (@Id, @Email, @ProviderId, @ProviderName, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, entities);

            return entities.Select(entity => entity.Id);
        }

        /// <inheritdoc />
        public async Task<User> GetAsync(Guid id)
        {
            var sql = "SELECT * FROM Users WHERE Id = @id";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryFirstOrDefaultAsync<User>(sql, new { id });
            return result;
        }

        /// <inheritdoc />
        public async Task<User> GetUserByEmailAsync(string email)
        {
            var sql = "SELECT * FROM Users WHERE Email = @email";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryFirstOrDefaultAsync<User>(sql, new { email });
            return result;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            var sql = @"SELECT * FROM Users";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryAsync<User>(sql);

            return result;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid id)
        {
            using var connection = GetMySqlConnection();
            string query = "DELETE FROM Users WHERE Id = @id";
            await connection.ExecuteAsync(query, new { id });
        }
    }
}
