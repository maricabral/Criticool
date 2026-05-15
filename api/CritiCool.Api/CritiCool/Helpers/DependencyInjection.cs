using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Configuration;
using CritiCool.Data.Repositories;
using CritiCool.Helpers;
using CritiCool.Infrastructure.Abstractions;
using CritiCool.Infrastructure.Providers.TMDB.Handlers;
using CritiCool.Infrastructure.Providers.TMDB.Services;
using CritiCool.Infrastructure.Services;
using System.Diagnostics.CodeAnalysis;

namespace CritiCool.Api.Helpers
{
    [ExcludeFromCodeCoverage]
    public static class DependencyInjection
    {
        public static IServiceCollection AddCollection(this IServiceCollection services, IConfiguration configuration) 
        {
            services.AddAutoMapper(typeof(MappingProfile));

            // Data Configuration

            // Add MySql Configuration
            services.Configure<DbSettings>(configuration.GetSection("DbSettings"));
            services.AddSingleton<ConnectionStrings>();

            // Create Database and Run Migrations
            services.CreateDbIfNotExists(configuration);
            services.UpdateDatabase();

            //Infrastructure Layer

            //Services
            services.AddTransient<ISeedService, SeedService>();
            services.AddTransient<IUserService, UserService>();
            services.AddTransient<IUserReviewService, UserReviewService>();
            services.AddTransient<IMovieService, MovieService>();

            //Repositories
            services.AddTransient<ISeedRepository, SeedRepository>();
            services.AddTransient<IUserRepository, UserRepository>();
            services.AddTransient<IUserReviewRepository, UserReviewRepository>();
            services.AddTransient<IMovieRepository, MovieRepository>();
            services.AddTransient<IReviewVotesRepository, ReviewVotesRepository>();

            //Providers
            services.AddTransient<TokenDelegatingHandler>();
            services.AddHttpClient<IMovieDBProvider, MovieDBProvider>().AddHttpMessageHandler<TokenDelegatingHandler>();
                  
            return services;
        }
    }
}
