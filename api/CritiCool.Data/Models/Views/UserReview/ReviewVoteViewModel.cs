using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.UserReview
{
    public class ReviewVoteViewModel
    {
        [Required]
        public Guid UserReviewId { get; set; }
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public bool IsUpvote { get; set; }

    }
}
