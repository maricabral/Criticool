using CritiCool.Data.Abstractions;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Models;
using CritiCool.Data.Models.Views.UserReview;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.Extensions.Logging;

namespace CritiCool.Infrastructure.Services
{
    public class UserReviewService(
        ILogger<UserReviewService> logger,
        IUserReviewRepository userReviewRepository,
        IMovieRepository movieRepository,
        IUserRepository userRepository,
        IReviewVotesRepository reviewVotesRepository) : IUserReviewService
    {
        private readonly ILogger<UserReviewService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        private readonly IMovieRepository _movieRepository = movieRepository ?? throw new ArgumentNullException(nameof(movieRepository));
        private readonly IUserReviewRepository _userReviewRepository = userReviewRepository ?? throw new ArgumentNullException(nameof(userReviewRepository));
        private readonly IUserRepository _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        private readonly IReviewVotesRepository _reviewVotesRepository = reviewVotesRepository ?? throw new ArgumentNullException(nameof(reviewVotesRepository));

        /// <inheritdoc />
        public async Task<IEnumerable<UserReviewViewModel>> GetUserReviewsAsync(Guid userReviewId)
        {
            try
            {
                var reviews = await _userReviewRepository.GetReviewsByUserIdAsync(userReviewId);
                return reviews;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while retrieving user {Id}", userReviewId);
                throw;
            }
        }

        /// <inheritdoc />
        public async Task<Guid> CreateUserReviewAsync(UserReview userReview)
        {
            try
            {
                // Check for duplicate userReview and handle accordingly
                var existingReview = await _userReviewRepository.ReviewExistsAsync(userReview.UserId, userReview.MovieId);
                if (existingReview)
                {
                    throw new DuplicateReviewException($"Review for user {userReview.UserId} and movie {userReview.MovieId} already exists.");
                }

                //check for valid movie
                var movie = await _movieRepository.GetAsync(userReview.MovieId);
                if (movie == null)
                {
                    throw new MovieNotFoundException($"Movie {userReview.MovieId} not found.");
                }

                //check for valid user
                var user = await _userRepository.GetAsync(userReview.UserId);
                if (user == null)
                {
                    throw new UserNotFoundException($"User {userReview.UserId} not found.");
                }

                return await _userReviewRepository.CreateAsync(userReview);
            }
            catch (Exception ex) when (!(ex is DuplicateReviewException || 
                                         ex is MovieNotFoundException || 
                                         ex is UserNotFoundException ))
            {
                _logger.LogError(ex, "Something went wrong while creating user review for movie {MovieId} made by user {UserId}", userReview.MovieId, userReview.UserId);
                throw;
            }
        }

        /// <inheritdoc />
        public Task DeleteUserReviewAsync(Guid userReviewId)
        {
            throw new NotImplementedException();
        }

        public async Task<ReviewThread> GetReviewThreadAsync(Guid reviewId)
        {
            try
            {
                var review = _userReviewRepository.GetAsync(reviewId);
                if (review == null)
                {
                    throw new UserReviewNotFoundException($"User Review {reviewId} was not found.");
                }

                var thread = await _userReviewRepository.GetReviewThreadByMainReviewIdAsync(reviewId);
                return thread;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while review {Id} thread", reviewId);
                throw;
            }
        }

        public async Task<Guid> ReplyUserReviewAsync(UserReview userReview)
        {
            try
            {
                if(userReview.ParentReviewId == null || userReview.ParentReviewId.GetValueOrDefault().Equals(Guid.Empty))
                {
                    throw new InvalidUserReviewParentException($"Parent review is invalid or unexistent");
                }

                // Check for parent review
                var parentReview = await _userReviewRepository.GetAsync(userReview.ParentReviewId.GetValueOrDefault());
                if (parentReview == null)
                {
                    throw new UserReviewNotFoundException ($"Parent user review {userReview.ParentReviewId.GetValueOrDefault()} was not found");
                }

                //check for valid movie
                var movie = await _movieRepository.GetAsync(userReview.MovieId);
                if (movie == null)
                {
                    throw new MovieNotFoundException($"Movie {userReview.MovieId} not found.");
                }

                //check for valid user
                var user = await _userRepository.GetAsync(userReview.UserId);
                if (user == null)
                {
                    throw new UserNotFoundException($"User {userReview.UserId} not found.");
                }

                return await _userReviewRepository.CreateAsync(userReview);
            }
            catch (Exception ex) when (!(ex is InvalidUserReviewParentException ||
                                         ex is UserReviewNotFoundException ||
                                         ex is MovieNotFoundException ||
                                         ex is UserNotFoundException))
            {
                _logger.LogError(ex, "Something went wrong while creating user review for movie {MovieId} made by user {UserId}", userReview.MovieId, userReview.UserId);
                throw;
            }
        }

        public async Task<Guid> Vote(ReviewVote reviewVote)
        {
            try
            {
                var userReview = _userReviewRepository.GetAsync(reviewVote.UserReviewId);
                if (userReview == null)
                {
                    throw new UserReviewNotFoundException($"User Review {reviewVote.UserReviewId} was not found.");
                }

                //check for valid user
                var user = await _userRepository.GetAsync(reviewVote.UserId);
                if (user == null)
                {
                    throw new UserNotFoundException($"User {reviewVote.UserId} not found.");
                }

                var existentUserVote = await _reviewVotesRepository.UserVoteExists(reviewVote.UserReviewId, reviewVote.UserId);
                if (existentUserVote)
                {
                    throw new DuplicateVoteException($"User {reviewVote.UserId} already voted for Review {reviewVote.UserReviewId}");
                }

                var voteId = await _reviewVotesRepository.CreateAsync(reviewVote);
                return voteId;
            }
            catch (Exception ex) when (!(ex is UserReviewNotFoundException ||
                                          ex is UserNotFoundException ||
                                          ex is DuplicateVoteException))
            {
                _logger.LogError(ex, "Something went wrong while voting applying user {UserId} vote for review {UserReview}", reviewVote.UserId, reviewVote.UserReviewId);
                throw;
            }
        }

        Task<UserReviewViewModel> IUserReviewService.GetReviewThreadAsync(Guid reviewId)
        {
            throw new NotImplementedException();
        }
    }
}
