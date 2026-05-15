using Dapper;
using MySql.Data.MySqlClient;

namespace CritiCool.Data.Repositories
{
    public abstract class BaseRepository(string connectionStrings)
    {
        private string _connectionStrings = connectionStrings;

        public MySqlConnection GetMySqlConnection()
        {
            DefaultTypeMap.MatchNamesWithUnderscores = true;
            return new MySqlConnection(_connectionStrings);
        }
    }
}
