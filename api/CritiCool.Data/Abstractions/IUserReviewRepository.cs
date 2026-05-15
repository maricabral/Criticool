using CritiCool.Data.Abstractions.Generic;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Models;
using CritiCool.Data.Models.Views.UserReview;

namespace CritiCool.Data.Abstractions
{
    public interface IUserReviewRepository : ICreate<UserReview>, IGet<UserReview>, IUpdate<UserReview>, IDelete<UserReview>
    {
        /// <summary>
        /// Checks if a review exists based on the provided user and movie identifiers.
        /// </summary>
        /// <param name="userId">The unique identifier of the user.</param>
        /// <param name="movieId">The unique identifier of the movie.</param>
        /// <returns>
        /// <c>true</c> if a review with the specified user and movie identifiers exists; otherwise, <c>false</c>.
        /// </returns>
        /// <remarks>
        /// This method queries the database to determine if a review has been submitted by the specified user for the given movie.
        /// It returns <c>true</c> if a review matching the criteria is found, and <c>false</c> if no matching review is found.
        /// </remarks>
        /// <seealso cref="UserReview"/>
        /// </summary>
        Task<bool> ReviewExistsAsync(Guid userId, Guid movieId);

        /// <summary>
        /// Retrieves a collection of user reviews associated with a specific user identifier.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose reviews are to be retrieved.</param>
        /// <returns>
        /// A collection of <see cref="UserReview"/> objects representing user reviews submitted by the specified user.
        /// </returns>
        /// <remarks>
        /// This method queries the database to retrieve all user reviews submitted by the user identified by the provided <paramref name="userId"/>.
        /// It returns a collection of <see cref="UserReview"/> objects, each representing a user review associated with the specified user.
        /// </remarks>
        /// <seealso cref="UserReview"/>
        /// </summary>
        Task<IEnumerable<UserReviewViewModel>> GetReviewsByUserIdAsync(Guid userId);

        /// <summary>
        /// Retrieves a review thread hierarchy based on the provided main review ID, including all child reviews and their associated upvotes and downvotes.
        /// </summary>
        /// <param name="mainReviewId">The unique identifier of the main review in the thread.</param>
        /// <returns>
        ///   <para>A <see cref="ReviewThread"/> object representing the review thread hierarchy.</para>
        ///   <para>Returns null if the main review is not found.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method uses a recursive query to retrieve a review thread hierarchy, starting from the main review specified by the <paramref name="mainReviewId"/>.</para>
        ///   <para>The hierarchy includes the main review, its child reviews, and their associated upvotes and downvotes. Child reviews can further act as parents for additional child reviews.</para>
        ///   <para>The resulting <see cref="ReviewThread"/> object contains information about the main review, its child reviews, upvotes, and downvotes.</para>
        /// </remarks>
        Task<ReviewThread> GetReviewThreadByMainReviewIdAsync(Guid mainReviewId);
    }
}
