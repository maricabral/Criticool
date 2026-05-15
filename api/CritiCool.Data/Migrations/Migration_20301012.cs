using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20231012)]
    public class Migration_20301012 : Migration
    {
        public override void Up()
        {
            // Create the UserReviewUpvotes table for the many-to-many relationship
            Create.Table("UserReviewUpvotes")
                .WithColumn("UserReviewId").AsGuid().NotNullable().ForeignKey("UserReviews", "Id")
                .WithColumn("UserId").AsGuid().NotNullable().ForeignKey("Users", "Id");

            // Create a unique constraint on UserReviewId and UserId
            Create.UniqueConstraint("UC_UserReviewUpvotes_UserReviewId_UserId")
                .OnTable("UserReviewUpvotes")
                .Columns("UserReviewId", "UserId");

            // Create the UserReviewDownvotes table for the many-to-many relationship
            Create.Table("UserReviewDownvotes")
                .WithColumn("UserReviewId").AsGuid().NotNullable().ForeignKey("UserReviews", "Id")
                .WithColumn("UserId").AsGuid().NotNullable().ForeignKey("Users", "Id");

            // Create a unique constraint on UserReviewId and UserId
            Create.UniqueConstraint("UC_UserReviewDownvotes_UserReviewId_UserId")
                .OnTable("UserReviewDownvotes")
                .Columns("UserReviewId", "UserId");
        }

        public override void Down()
        {
            Delete.Table("UserReviewUpvotes");
            Delete.Table("UserReviewDownvotes");
        }
    }
}
