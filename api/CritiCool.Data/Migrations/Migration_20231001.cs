using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20231001)]
    public class Migration_20231001 : Migration
    {
        public override void Up()
        {
            Delete.Column("Opinion").FromTable("RatingThread");
            Alter.Table("RatingThread").AddColumn("UpVotes").AsInt32().NotNullable().WithDefaultValue(0);
            Alter.Table("RatingThread").AddColumn("DownVotes").AsInt32().NotNullable().WithDefaultValue(0);
        }

        public override void Down()
        {
            Alter.Table("RatingThread").AddColumn("Opinion").AsBoolean().Nullable();
            Delete.Column("UpVotes").FromTable("RatingThread");
            Delete.Column("DownVotes").FromTable("RatingThread");
        }
    }
}
