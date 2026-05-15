using FluentMigrator;

namespace CritiCool.Data.Migrations
{
    [Migration(20230425)]
    public class Migration_20230425 : Migration
    {
        public override void Up()
        {
            Create.Table("Users")
                .WithColumn("Id").AsGuid().PrimaryKey().Unique()
                .WithColumn("Email").AsString(256).NotNullable()
                .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
                .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.Table("UserFollowers")
                .WithColumn("Id").AsGuid().PrimaryKey().Unique()
                .WithColumn("UserId").AsGuid().ForeignKey("Users", "Id")
                .WithColumn("FollowerId").AsGuid().ForeignKey("Users", "Id")
                .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
                .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.Table("Movies")
                .WithColumn("Id").AsGuid().PrimaryKey().Unique()
                .WithColumn("ProviderId").AsInt64().NotNullable()
                .WithColumn("Title").AsString().NotNullable()                
                .WithColumn("ReleaseDate").AsDate().NotNullable()
                .WithColumn("GenresIds").AsString().Nullable()
                .WithColumn("ImagePath").AsString().Nullable()
                .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
                .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.Table("Genres")
               .WithColumn("Id").AsGuid().PrimaryKey().Unique()
               .WithColumn("ProviderId").AsInt16().NotNullable()
               .WithColumn("Name").AsString().NotNullable()
               .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
               .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.Table("UserReviews")
               .WithColumn("Id").AsGuid().PrimaryKey().Unique()
               .WithColumn("UserId").AsGuid().ForeignKey("Users", "Id")
               .WithColumn("MovieId").AsGuid().ForeignKey("Movies", "Id")
               .WithColumn("Rating").AsInt16().NotNullable()
               .WithColumn("Review").AsString().Nullable()
               .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
               .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.Table("RatingThread")
               .WithColumn("Id").AsGuid().PrimaryKey().Unique()
               .WithColumn("UserId").AsGuid().ForeignKey("Users", "Id")
               .WithColumn("ReviewId").AsGuid().ForeignKey("UserReviews", "Id")
               .WithColumn("Opinion").AsBoolean().Nullable()
               .WithColumn("Comments").AsString().Nullable()
               .WithColumn("DateCreated").AsDate().WithDefaultValue(DateTime.Now).NotNullable()
               .WithColumn("DateUpdated").AsDate().WithDefaultValue(DateTime.Now).NotNullable();

            Create.UniqueConstraint("UserEmail")
                    .OnTable("Users")
                    .Column("Email");

            Create.UniqueConstraint("MovieName")
                .OnTable("Movies")
                .Column("ProviderId");

            Create.UniqueConstraint("UserReviews")
                .OnTable("UserReviews")
                .Columns("UserId", "MovieId");

            Create.Index("IX_Movie_Name")
                .OnTable("Movies")
                .OnColumn("Title").Ascending();
        }

        public override void Down()
        {
            Delete.Table("Users");
            Delete.Table("UserFollowers");
            Delete.Table("Movies");
            Delete.Table("Genres");
            Delete.Table("UserReviews");
            Delete.Table("RatingThread");
            Delete.Index("IX_Movie_Name");
        }
    }
}
