using CritiCool.Data.Abstractions;
using Dapper;

namespace CritiCool.Data.Repositories
{
    public class SeedRepository(string connectionStrings) : BaseRepository(connectionStrings), ISeedRepository
    {
        public async Task NukeCritiCool()
        {
            var sql = @"SET FOREIGN_KEY_CHECKS = 0;

                        TRUNCATE TABLE RatingThread;
                        TRUNCATE TABLE UserRatings;
                        TRUNCATE TABLE Movies;
                        TRUNCATE TABLE UserFollowers;
                        TRUNCATE TABLE Users;

                        SET FOREIGN_KEY_CHECKS = 1;";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql);
        }       
    }
}
