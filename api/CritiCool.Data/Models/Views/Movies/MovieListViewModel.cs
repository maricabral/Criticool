using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Models.Views.Movies
{
    public class MovieListViewModel(IEnumerable<Movie> movies, int currentPage, int pageSize, int totalCount)
    {
        public IEnumerable<Movie> Movies { get; set; } = movies;
        public int TotalPages { get; set; } = (int)Math.Ceiling((double)totalCount / pageSize);
        public int CurrentPage { get; set; } = currentPage;
    }
}
