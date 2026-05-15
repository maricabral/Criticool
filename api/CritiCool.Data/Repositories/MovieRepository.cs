using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Entities;
using Dapper;

namespace CritiCool.Data.Repositories
{
    public class MovieRepository(string connectionStrings) : BaseRepository(connectionStrings), IMovieRepository
    {

        /// <inheritdoc />
        public async Task<Guid> CreateAsync(Movie movie)
        {
            var sql = @"INSERT INTO Movies (Id, ProviderId, Title, ReleaseDate, GenresIds, ImagePath, DateCreated, DateUpdated)
                        VALUES (@Id, @ProviderId, @Title, @ReleaseDate, @GenresIds, @ImagePath, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, movie);

            return movie.Id;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Guid>> CreateAsync(List<Movie> movies)
        {
            var sql = @"INSERT INTO Movies (Id, ProviderId, Title, ReleaseDate, GenresIds, ImagePath, DateCreated, DateUpdated)
                        VALUES (@Id, @ProviderId, @Title, @ReleaseDate, @GenresIds, @ImagePath, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, movies);

            return movies.Select(movies => movies.Id);
        }

        /// <inheritdoc />
        public async Task<Movie> GetAsync(Guid id)
        {
            var sql = "SELECT * FROM Movies WHERE Id = @id";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryFirstOrDefaultAsync<Movie>(sql, new { id });
            return result;
        }

        /// <inheritdoc />
        public async Task<int> GetTotalMovieCountAsync()
        {
            var sql = "SELECT COUNT(*) FROM Movies";

            using var connection = GetMySqlConnection();
            var result = await connection.QuerySingleAsync<int>(sql);

            return result;
        }

        /// <inheritdoc />
        public async Task<(IEnumerable<Movie> Movies, int TotalCount)> GetAllMoviesAsync(int skip, int take, string search, string maxReleaseDate)
        {

                var sql = "SELECT * FROM Movies WHERE 1=1";
                var countSql = "SELECT COUNT(*) FROM Movies WHERE 1=1";

                // Apply search filter if a search term is provided
                if (!string.IsNullOrEmpty(search))
                {
                    sql += " AND Title LIKE @Search";
                    countSql += " AND Title LIKE @Search";
                }

                countSql += " AND ReleaseDate <= @MaxReleaseDate";
                sql += " AND ReleaseDate <= @MaxReleaseDate ORDER BY ReleaseDate DESC";
                sql += " LIMIT @Skip, @Take";

                using var connection = GetMySqlConnection();

                // Execute both queries asynchronously
                var movies = await connection.QueryAsync<Movie>(sql, new { Skip = skip, Take = take, Search = $"%{search}%", MaxReleaseDate = maxReleaseDate });
                var totalCount = await connection.ExecuteScalarAsync<int>(countSql, new { Search = $"%{search}%", MaxReleaseDate = maxReleaseDate });

                return (movies, totalCount);            
        }

        /// <inheritdoc />
        public async Task<IEnumerable<Movie>> GetLast100MoviesAsync()
        {
            var sql = @"SELECT * FROM Movies 
                        ORDER BY ReleaseDate DESC 
                        LIMIT 100";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryAsync<Movie>(sql);

            return result;
        }

        /// <inheritdoc />
        public async Task<IEnumerable<int>> GetAllProviderIdsAsync()
        {
            var sql = @"SELECT ProviderId FROM Movies";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryAsync<int>(sql);

            return result;
        }

        /// <inheritdoc />
        public async Task<string> GetLatestReleaseDate()
        {
            var defaultDate = "1800-01-01";

            var sql = @"SELECT ReleaseDate FROM Movies 
                        ORDER BY ReleaseDate DESC
                        LIMIT 1";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryFirstOrDefaultAsync<DateTime>(sql);

            return result.Equals(DateTime.MinValue) ? defaultDate : result.ToString("yyyy-MM-dd");
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid id)
        {
            using var connection = GetMySqlConnection();
            string query = "DELETE FROM Movies WHERE Id = @id";
            await connection.ExecuteAsync(query, new { id });
        }
    }
}
