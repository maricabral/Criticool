using CritiCool.Data.Models.Views.UserReview;

namespace CritiCool.Data.Models.Models
{
    public class ReviewThread
    {
       public UserReviewViewModel mainReview { get; set; } = new UserReviewViewModel();
       public List<UserReviewViewModel> childReviews { get; set; } = [];
     }
}
