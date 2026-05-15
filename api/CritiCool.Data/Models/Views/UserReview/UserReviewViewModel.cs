using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.UserReview
{
    public class UserReviewViewModel
    {
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public Guid MovieId { get; set; }
        public Guid? ParentReviewId { get; set; }
        [Required]
        [UserRatingRangeAttribute]
        public short Rating { get; set; }
        public string Review { get; set; } = string.Empty;
        public int UpVotes { get; set; } = 0;
        public int DownVotes { get; set; } = 0;
    }
}
