using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20231011)]
    public class Migration_20301011 : Migration
    {
        public override void Up()
        {
            Alter.Table("UserReviews").AddColumn("ParentReviewId").AsGuid().Nullable();
        }

        public override void Down()
        {
            Delete.Column("ParentReviewId").FromTable("UserReviews");
        }
    }
}
