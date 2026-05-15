using AutoMapper;
using CritiCool.Data.Abstractions;
using CritiCool.Data.Models.Providers.TMDB;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using static CritiCool.Infrastructure.Extentions.DateExtensions;

namespace CritiCool.Infrastructure.Providers.TMDB.Services
{
    /// <summary>
    /// Movie Database Provider. Used to feed CritiCool movies
    /// </summary>
    public class MovieDBProvider : IMovieDBProvider
    { 
        private readonly ILogger<MovieDBProvider> _logger;
        private readonly IMapper _mapper;
        private readonly IMovieRepository _movieRepository;
        private readonly HttpClient _httpClient;

        public MovieDBProvider(ILogger<MovieDBProvider> logger, IMapper mapper,  IMovieRepository movieRepository, HttpClient httpClient)
        {
            _logger = logger;
            _mapper = mapper;
            _httpClient = httpClient;
            _movieRepository = movieRepository;

            _httpClient.BaseAddress = new Uri("https://api.themoviedb.org");
        }

        public async Task<bool> SeedCritiCoolMoviesAsync(DateTime? forcedReleaseDate)
        {
            try
            {
                string releaseDate = forcedReleaseDate is null
                    ? await _movieRepository.GetLatestReleaseDate()
                    : forcedReleaseDate.ToReleaseString();

                int page = 1, maxPage = 50, totalPages = -1;
                var movies = new List<Movie>();

                while (page <= maxPage && (totalPages == -1 || page <= totalPages))
                {
                    var response = await _httpClient.GetAsync($"/3/discover/movie?include_adult=false&page={page}&release_date.gte={releaseDate}&sort_by=release_date.asc");
                    var result = await response.Content.ReadFromJsonAsync<Result<Movie>>();

                    if (result != null)
                    {
                        totalPages = result.TotalPages;

                        var providerIds = await _movieRepository.GetAllProviderIdsAsync();
                        var newMovies = result.Results.Where(r => !providerIds.Contains(r.Id)).ToList();

                        if (newMovies.Count == 0)
                        {
                            var maxResponse = await _httpClient.GetAsync($"/3/discover/movie?include_adult=false&page={maxPage}&release_date.gte={releaseDate}&sort_by=release_date.asc");
                            var maxResult = await maxResponse.Content.ReadFromJsonAsync<Result<Movie>>();
                            var maxResultIds = maxResult is null ? [] : maxResult.Results.Select(r => r.Id);

                            if (maxResultIds.All(providerIds.Contains))
                            {
                                releaseDate = releaseDate.GetNextStringDateByMonth();
                                page = 1;
                                movies.Clear();
                            }
                            else
                            {
                                page++;
                            }
                        }
                        else
                        {
                            movies.AddRange(newMovies);

                            if (page == maxPage)
                            {
                                var moviesWithoutDates = movies.Where(m => m.ReleaseDate == null).ToList();
                                moviesWithoutDates.ForEach(m => m.ReleaseDate = releaseDate);
                                movies = movies.Where(m => m.ReleaseDate != null).Union(moviesWithoutDates).ToList();

                                var entityMovies = movies.Where(m => !providerIds.Contains(m.Id))
                                                         .Distinct()
                                                         .OrderBy(movie => movie.ReleaseDate)
                                                         .ThenBy(movie => movie.Id)
                                                         .Select(_mapper.Map<Data.Models.Entities.Movie>)
                                                         .ToList();

                                await _movieRepository.CreateAsync(entityMovies);

                                releaseDate = releaseDate.GetNextStringDateByMonth();
                                page = 1;
                                movies.Clear();
                            }
                            else
                            {
                                page++;
                            }
                        }


                    }
                    else
                    {
                        releaseDate = releaseDate.GetNextStringDate();
                        page = 1;
                        movies.Clear();
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while seeding MovieDB");
                return false;
            }
        }   
    }
}
