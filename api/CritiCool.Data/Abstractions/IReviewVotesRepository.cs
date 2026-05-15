using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions
{
    public interface IReviewVotesRepository : ICreate<ReviewVote>, IGetMany<IEnumerable<ReviewVote>>, IUpdate<ReviewVote>, IDelete<ReviewVote>
    {
        /// <summary>
        /// Checks if a review exists based on the provided user and review identifiers.
        /// </summary>
        /// <param name="reviewId">The unique identifier of the review for which the vote is being retrieved.</param>
        /// <param name="userId">The unique identifier of the user who cast the vote.</param>
        /// <returns>
        /// <c>true</c> if a review with the specified user and review identifiers exists; otherwise, <c>false</c>.
        /// </returns>
        Task<bool> UserVoteExists(Guid reviewId, Guid userId);
    }
}
