using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Entities
{
    public class ReviewVote : Entity
    {
        [Required]
        public Guid UserReviewId { get; set; }
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public bool IsUpvote { get; set; }
    }
}
