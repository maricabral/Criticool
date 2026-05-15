using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20231013)]
    public class Migration_20301013 : Migration
    {
        public override void Up()
        {
            Delete.Table("UserReviewUpvotes");
            Delete.Table("UserReviewDownvotes");

            // Create the UserReviewUpvotes table for the many-to-many relationship
            Create.Table("UserReviewVotes")
                .WithColumn("UserReviewId").AsGuid().NotNullable().ForeignKey("UserReviews", "Id")
                .WithColumn("UserId").AsGuid().NotNullable().ForeignKey("Users", "Id")
                .WithColumn("IsUpvote").AsBoolean().NotNullable();

            // Create a unique constraint on UserReviewId and UserId
            Create.UniqueConstraint("UC_UserReviewUpvotes_UserReviewId_UserId")
                .OnTable("UserReviewVotes")
                .Columns("UserReviewId", "UserId");
        }

        public override void Down()
        {
            Delete.Table("UserReviewVotes");
        }
    }
}
