using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.UserReview
{
    public class CreateUserReviewViewModel
    {
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public Guid MovieId { get; set; }
        [Required]
        [UserRatingRangeAttribute]
        public short Rating { get; set; }
        public string Review { get; set; } = string.Empty;
    }
}
