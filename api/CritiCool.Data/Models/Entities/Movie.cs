namespace CritiCool.Data.Models.Entities
{
    public class Movie : Entity
    {
        public int ProviderId { get; set; }
        public string? Title { get; set; }
        public DateTime ReleaseDate { get; set; }
        public string? GenresIds { get; set; }
        public string? ImagePath { get; set; }
    }
}
