using CritiCool.Data.Models.Configuration;
using CritiCool.Data.Repositories;
using Dapper;
using FluentMigrator.Runner;
using MySql.Data.MySqlClient;
using System.Diagnostics.CodeAnalysis;

namespace CritiCool.Api.Helpers
{
    [ExcludeFromCodeCoverage]
    public static class DataContext
    {
        public static void CreateDbIfNotExists(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionStrings = services.BuildServiceProvider().GetRequiredService<ConnectionStrings>();
            services.AddSingleton(connectionStrings.CritiCoolConnectionString);
            var context = configuration.GetSection("DbSettings").Get<DbSettings>();

            if (context is null) return;

            using var connection = new MySqlConnection(connectionStrings.CritiCoolConnectionString);
            var query = $"CREATE DATABASE IF NOT EXISTS {context.Database};";
            connection.Query(query);
        }

        public static IServiceCollection UpdateDatabase(this IServiceCollection services)
        {
            var connectionStrings = services.BuildServiceProvider().GetRequiredService<ConnectionStrings>();
            
            services.AddFluentMigratorCore().ConfigureRunner(runner =>
                runner.AddMySql5()
                .WithGlobalConnectionString(connectionStrings.CritiCoolConnectionString)
                .ScanIn(typeof(BaseRepository).Assembly).For.Migrations()).AddLogging(lb => lb.AddFluentMigratorConsole());

            var runner =  services.BuildServiceProvider().GetRequiredService<IMigrationRunner>();           
            runner.MigrateUp();

            return services;
        }             
    }
}
