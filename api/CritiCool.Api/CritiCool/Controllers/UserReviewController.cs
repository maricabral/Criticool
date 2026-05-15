using AutoMapper;
using CritiCool.Data.Exceptions.Movie;
using CritiCool.Data.Exceptions.User;
using CritiCool.Data.Exceptions.UserReview;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.UserReview;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace CritiCool.Controllers
{
    /// <summary>
    /// API controller for managing user review related operations.
    /// </summary>
    /// <remarks>
    ///   <para>This controller provides endpoints for performing various user-review related operations, including retrieving review information, creating reviews, updating reviews, and deleting reviews.</para>
    ///   <para>It handles user review creation, as well as user review deletion.</para>
    ///   <para>Responses include 200 OK or 201 created for successful operations, 400 Bad Request for invalid data or user conflicts, 404 Not Found for resource not found, and 500 Internal Server Error for unexpected errors.</para>
    /// </remarks>
    [Route("[controller]")]
    [ApiController]
    public class UserReviewController(IUserReviewService userReviewService, IMapper mapper, ILogger<UserReviewController> logger) : ControllerBase
    {
        private readonly IUserReviewService _userReviewService = userReviewService ?? throw new ArgumentNullException(nameof(userReviewService));
        private readonly IMapper _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        private readonly ILogger<UserReviewController> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        /// <summary>
        /// Retrieves a collection of reviews associated with a specific id.
        /// </summary>
        /// <param name="reviewId">The unique identifier of the thread to be retrieved.</param>
        /// <returns>
        ///   <para>Returns a 200 OK response with thread</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        [HttpGet("{reviewId}/thread")]
        [ProducesResponseType(typeof(IEnumerable<UserReviewViewModel>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetReviewThread(Guid reviewId)
        {
            try
            {
                var reviewThread = await _userReviewService.GetReviewThreadAsync(reviewId);
                return Ok(reviewThread);
            }

            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while retrieving review {ReviewId} thread", reviewId);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Retrieves a collection of user reviews associated with a specific user.
        /// </summary>
        /// <param name="userId">The unique identifier of the user whose reviews are to be retrieved.</param>
        /// <returns>
        ///   <para>Returns a 200 OK response with the reviews.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        [HttpGet("{userId}")]
        [ProducesResponseType(typeof(IEnumerable<UserReviewViewModel>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetUserReviews(Guid userId)
        {
            try
            {
                var userReviews = await _userReviewService.GetUserReviewsAsync(userId);
                return Ok(userReviews);
            }

            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while retrieving user {UserId} reviews", userId);
                return StatusCode(500, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Creates a new user review based on the provided user review model.
        /// </summary>
        /// <param name="createUserReviewModel">The model containing user information to be created.</param>
        /// <returns>
        ///   <para>Returns a 201 Created response with the newly created user review Id if the operation is successful.</para>
        ///   <para>Returns a 400 Bad Request response if the provided data is invalid or a duplicate user review.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        [HttpPost]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateUserReview([FromBody] CreateUserReviewViewModel createUserReviewModel)
        {
            try
            {
                var userReview = _mapper.Map<UserReview>(createUserReviewModel);
                var reviewId = await _userReviewService.CreateUserReviewAsync(userReview);                

                return CreatedAtAction(nameof(CreateUserReview), new { reviewId }, reviewId);
            }
            catch (DuplicateReviewException ex)
            {
                _logger.LogWarning(ex, "Duplicate review: {Message}", ex.Message);
                return Conflict(ex.Message);
            }
            catch (MovieNotFoundException ex)
            {
                _logger.LogWarning(ex, "Movie not found: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (UserNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while creating user review for movie {MovieId} made by user {UserId}", createUserReviewModel.MovieId, createUserReviewModel.UserId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Creates a new review vote based on the provided user model.
        /// </summary>
        /// <param name="reviewVoteViewModel">A <see cref="ReviewVoteViewModel"/> containing the vote details.</param>
        /// <returns>
        ///   <para>Returns a 204 No Content response if the vote is successfully cast.</para>
        ///   <para>Returns a 409 Conflict response if there is an issue with the vote operation, such as the review not being found or a duplicate vote.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        /// <remarks>
        ///   <para>This method handles the process of casting a vote on a review.</para>
        ///   <para>If the vote is successfully cast, it returns a 204 No Content response.</para>
        ///   <para>If there is an issue with the vote operation, such as the review not being found or a duplicate vote, it returns a 409 Conflict response with an appropriate error message.</para>
        ///   <para>If any unexpected error occurs during the operation, it is logged, and a 500 Internal Server Error response is returned with an error message.</para>
        /// </remarks>
        [HttpPost("Vote")]
        public async Task<IActionResult> Vote([FromBody] ReviewVoteViewModel reviewVoteViewModel)
        {
            try
            {
                var reviewVote = _mapper.Map<ReviewVote>(reviewVoteViewModel);
                await _userReviewService.Vote(reviewVote);
                return NoContent();
            }
            catch (UserReviewNotFoundException ex)
            {
                _logger.LogWarning(ex, "Review not found: {Message}", ex.Message);
                return Conflict(ex.Message);
            }
            catch (UserNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (DuplicateVoteException ex)
            {
                _logger.LogWarning(ex, "User already voted for this review: {Message}", ex.Message);
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while voting applying user {UserId} vote for review {UserReview}", reviewVoteViewModel.UserId, reviewVoteViewModel.UserReviewId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing your request.");
            }
        }

        /// <summary>
        /// Creates a reply for an existent user review
        /// </summary>
        /// <param name="userReview">The model containing the review to be replied and replied information.</param>
        /// <returns>
        ///   <para>Returns a 201 Created response with the newly created user review reply Id if the operation is successful.</para>
        ///   <para>Returns a 400 Bad Request response if the provided data is invalid.</para>
        ///   <para>Returns a 500 Internal Server Error response if an unexpected error occurs during processing.</para>
        /// </returns>
        [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        [HttpPost("reply")]
        public async Task<IActionResult> ReplyUserReview([FromBody] UserReplyViewModel userReply)
        {
            try
            {
                var userReview = _mapper.Map<UserReview>(userReply);
                var reviewId = await _userReviewService.ReplyUserReviewAsync(userReview);

                return CreatedAtAction(nameof(ReplyUserReview), new { reviewId }, reviewId);
            }
            catch (UserReviewNotFoundException ex)
            {
                _logger.LogWarning(ex, "Parent review not found: {Message}", ex.Message);
                return Conflict(ex.Message);
            }
            catch (MovieNotFoundException ex)
            {
                _logger.LogWarning(ex, "Movie not found: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (UserNotFoundException ex)
            {
                _logger.LogWarning(ex, "User not found: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while creating user review for movie {MovieId} made by user {UserId}", userReply.MovieId, userReply.UserId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing your request.");
            }
        }
    }
}
