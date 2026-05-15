using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.UserReview
{
    public class UserReplyViewModel
    {
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public Guid MovieId { get; set; }
        [Required]
        public Guid ParentReviewId { get; set; }
        public string Review { get; set; } = string.Empty;
    }
}
