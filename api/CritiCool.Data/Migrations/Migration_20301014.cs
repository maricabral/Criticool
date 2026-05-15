using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20301014)]
    public class Migration_20301014 : Migration
    {
        public override void Up()
        {
            Delete.Column("UpVotes").FromTable("UserReviews");
            Delete.Column("DownVotes").FromTable("UserReviews");
        }

        public override void Down()
        {
            Alter.Table("UserReviews").AddColumn("UpVotes").AsInt32().NotNullable().WithDefaultValue(0);
            Alter.Table("UserReviews").AddColumn("DownVotes").AsInt32().NotNullable().WithDefaultValue(0);
        }
    }
}
