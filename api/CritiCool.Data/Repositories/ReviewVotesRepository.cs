using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Entities;
using Dapper;

namespace CritiCool.Data.Repositories
{
    public class ReviewVotesRepository(string connectionStrings) : BaseRepository(connectionStrings), IReviewVotesRepository
    {
        public async Task<Guid> CreateAsync(ReviewVote entity)
        {
            var sql = @"INSERT INTO ReviewVotes (Id, UserReviewId, UserId, IsUpvote, DateCreated, DateUpdated)
                VALUES (@Id, @UserReviewId, @UserId, @IsUpvote, @DateCreated, @DateUpdated)";

            using var connection = GetMySqlConnection();
            await connection.ExecuteAsync(sql, entity);

            return entity.Id;
        }

        public async Task<bool> UserVoteExists(Guid reviewId, Guid userId)
        {
            var sql = "SELECT COUNT(*) FROM ReviewVotes WHERE UserReviewId = @reviewId and UserId = @userId";

            using var connection = GetMySqlConnection();
            var count = await connection.ExecuteScalarAsync<int>(sql, new { reviewId, userId });
            return count > 0;  // If count is greater than 0, a review exists; otherwise, it doesn't
        }

        public async Task<IEnumerable<ReviewVote>> GetManyAsync(Guid reviewId)
        {
            var sql = "SELECT * FROM ReviewVotes WHERE UserReviewId = @reviewId";

            using var connection = GetMySqlConnection();
            var result = await connection.QueryAsync<ReviewVote>(sql, new { reviewId });
            return result;
        }

        public Task UpdateAsync(ReviewVote entity)
        {
            throw new NotImplementedException();
        }

        public Task DeleteAsync(Guid id)
        {
            throw new NotImplementedException();
        }
    }
}
