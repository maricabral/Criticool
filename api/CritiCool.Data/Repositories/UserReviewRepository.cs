using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Models;
using CritiCool.Data.Models.Views.UserReview;
using Dapper;

namespace CritiCool.Data.Repositories
{
    public class UserReviewRepository(string connectionStrings) : BaseRepository(connectionStrings), IUserReviewRepository
    {

        /// <inheritdoc />
        public async Task<UserReview> GetAsync(Guid id)
        {
            var sql = "SELECT * FROM UserReviews WHERE Id = @id";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryFirstOrDefaultAsync<UserReview>(sql, new { id });
            return result;
        }

        /// <inheritdoc />
        public async Task<Guid> CreateAsync(UserReview entity)
        {
            var sql = @"INSERT INTO UserReviews (Id, UserId, MovieId, ParentReviewId, Rating, Review, DateCreated, DateUpdated)
                VALUES (@Id, @UserId, @MovieId, @ParentReviewId, @Rating, @Review, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, entity);

            return entity.Id;
        }

        /// <inheritdoc />
        public Task UpdateAsync(UserReview entity)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc />
        public async Task<bool> ReviewExistsAsync(Guid userId, Guid movieId)
        {
            var sql = "SELECT COUNT(*) FROM UserReviews WHERE UserId = @UserId AND MovieId = @MovieId";

            using var connection = GetMySqlConnection();
            var count = await connection.ExecuteScalarAsync<int>(sql, new { UserId = userId, MovieId = movieId });
            return count > 0;  // If count is greater than 0, a review exists; otherwise, it doesn't
        }

        /// <inheritdoc />
        public async Task<IEnumerable<UserReviewViewModel>> GetReviewsByUserIdAsync(Guid userId)
        {
            var sql = @"WITH VoteCounts AS (
                        SELECT
                            rv.UserReviewId,
                            SUM(CASE WHEN rv.IsUpvote = 1 THEN 1 ELSE 0 END) AS UpVotes,
                            SUM(CASE WHEN rv.IsUpvote = 0 THEN 1 ELSE 0 END) AS DownVotes
                        FROM ReviewVotes rv
                        WHERE rv.UserId = @UserId
                        GROUP BY rv.UserReviewId
                        )

                        SELECT
                            ur.UserId,
                            ur.MovieId,
                            ur.ParentReviewId,
                            ur.Rating,
                            ur.Review,
                            COALESCE(vc.UpVotes, 0) AS UpVotes,
                            COALESCE(vc.DownVotes, 0) AS DownVotes
                        FROM UserReviews ur
                        LEFT JOIN VoteCounts vc ON ur.Id = vc.UserReviewId
                        WHERE ur.UserId = @UserId;";

            using var connection = GetMySqlConnection();
            var reviews = await connection.QueryAsync<UserReviewViewModel>(sql, new { UserId = userId });

            return reviews;
        }

        public async Task<ReviewThread> GetReviewThreadByMainReviewIdAsync(Guid mainReviewId)
        {
            var sql = @"
                    WITH RECURSIVE ReviewThreadCTE AS (
                        -- Anchor query: Retrieve the main review
                        SELECT
                            ur.Id,
                            ur.UserId,
                            ur.MovieId,
                            ur.ParentReviewId,
                            ur.Rating,
                            ur.Review,
                            0 AS Level
                        FROM UserReviews ur
                        WHERE ur.Id = @MainReviewId
                                UNION ALL
                        -- Recursive query: Retrieve child reviews
                        SELECT
                            ur.Id,
                            ur.UserId,
                            ur.MovieId,
                            ur.ParentReviewId,
                            ur.Rating,
                            ur.Review,
                            cte.Level + 1
                        FROM UserReviews ur
                        INNER JOIN ReviewThreadCTE cte ON ur.ParentReviewId = cte.Id)
                    SELECT
                        MAX(cte.Id) AS MainReviewId,
                        MAX(cte.UserId) AS UserId,
                        MAX(cte.MovieId) AS MovieId,
                        MAX(cte.ParentReviewId) AS ParentReviewId,
                        MAX(cte.Rating) AS Rating,
                        MAX(cte.Review) AS Review,
                        SUM(CASE WHEN rv.IsUpvote = 1 THEN 1 ELSE 0 END) AS UpVotes,
                        SUM(CASE WHEN rv.IsUpvote = 0 THEN 1 ELSE 0 END) AS DownVotes
                    FROM ReviewThreadCTE cte
                    LEFT JOIN ReviewVotes rv ON cte.Id = rv.UserReviewId
                    GROUP BY cte.Level;";

            using var connection = GetMySqlConnection();
            var reviewThread = await connection.QueryFirstOrDefaultAsync<ReviewThread>(sql, new { MainReviewId = mainReviewId });
            return reviewThread;
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid id)
        {
            using var connection = GetMySqlConnection();
            string query = "DELETE FROM UserReviews WHERE Id = @id";
            await connection.ExecuteAsync(query, new { id });
        }
    }
}
