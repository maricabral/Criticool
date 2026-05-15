using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20230831)]
    public class Migration_20230831 : Migration
    {
        public override void Up()
        {
            Alter.Table("Users").AddColumn("ProviderId").AsString().Nullable();
            Alter.Table("Users").AddColumn("ProviderName").AsString().Nullable();
        }

        public override void Down()
        {
            Delete.Column("ProviderId").FromTable("User");
            Delete.Column("ProviderName").FromTable("User");
        }
    }
}
