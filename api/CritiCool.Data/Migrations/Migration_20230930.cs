using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20230930)]
    public class Migration_20230930 : Migration
    {
        public override void Up()
        {
            Alter.Table("UserReviews").AddColumn("UpVotes").AsInt32().NotNullable().WithDefaultValue(0);
            Alter.Table("UserReviews").AddColumn("DownVotes").AsInt32().NotNullable().WithDefaultValue(0);
        }

        public override void Down()
        {
            Delete.Column("UpVotes").FromTable("UserReviews");
            Delete.Column("DownVotes").FromTable("UserReviews");
        }
    }
}
