using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.UserReview;

namespace CritiCool.Infrastructure.Abstractions
{
    /// <summary>
    /// Service Layer for User Review Operations
    /// </summary>
    public interface IUserReviewService
    {
        /// <summary>
        /// Creates a new user review.
        /// </summary>
        /// <param name="userReview">The user object to create.</param>
        /// <returns>The ID of the created user review.</returns>
        Task<Guid> CreateUserReviewAsync(UserReview userReview);

        /// <summary>
        /// Retrieves a user review by ID.
        /// </summary>
        /// <param name="userReviewId">The ID of the user review to retrieve.</param>
        /// <returns>The user object if found; otherwise, null.</returns>
        Task<IEnumerable<UserReviewViewModel>> GetUserReviewsAsync(Guid userReviewId);

        /// <summary>
        /// Deletes a user review.
        /// </summary>
        /// <param name="userReviewId">The ID of the user review to delete.</param>
        Task DeleteUserReviewAsync(Guid userReviewId);
        Task<Guid> ReplyUserReviewAsync(UserReview userReview);
        Task<Guid> Vote(ReviewVote reviewVote);
        Task<UserReviewViewModel> GetReviewThreadAsync(Guid reviewId);
    }
}
