using System.Text.Json.Serialization;

namespace CritiCool.Data.Models.Providers.TMDB
{
    public class Result<T> 
    {
        public int Page { get; set; }

        public List<T> Results { get; set; } = [];

        [JsonPropertyName("total_pages")]
        public int TotalPages { get; set; }

        [JsonPropertyName("total_results")]
        public int TotalResults { get; set; }
    }
}
