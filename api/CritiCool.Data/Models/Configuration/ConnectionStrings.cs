using Microsoft.Extensions.Options;
using MySql.Data.MySqlClient;

namespace CritiCool.Data.Models.Configuration
{
    public class ConnectionStrings
    {
        private DbSettings _dbSettings;
        public string CritiCoolConnectionString { get; private set; } = string.Empty;

        public ConnectionStrings(IOptions<DbSettings> dbSettings) 
        {
           _dbSettings = dbSettings.Value;
           SetCritiCoolConnectionString();
        }

        private void SetCritiCoolConnectionString()
        {
            var connectionString = new MySqlConnectionStringBuilder
            {
                Server = _dbSettings.Server,
                Database = _dbSettings.Database,
                Port = _dbSettings.Port,
                UserID = _dbSettings.UserId,
                Password = _dbSettings.Password
            };               

           CritiCoolConnectionString = connectionString.ConnectionString;
        }
    }
}
