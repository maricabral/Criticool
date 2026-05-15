using AutoMapper;
using CritiCool.Data.Models.Entities;
using CritiCool.Data.Models.Views.UserReview;
using CritiCool.Data.Models.Views.Users;

namespace CritiCool.Helpers
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            //Movies

            //TMDB Movies
            CreateMap<Data.Models.Providers.TMDB.Movie, Movie>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => Guid.NewGuid()))
                .ForMember(dest => dest.ProviderId, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.ReleaseDate, opt => opt.MapFrom(src => DateTime.Parse(src.ReleaseDate)))
                .ForMember(dest => dest.GenresIds, opt => opt.MapFrom(src => string.Join(";", src.GenreIds)))
                .ForMember(dest => dest.ImagePath, opt => opt.MapFrom(src => src.PosterPath));

            CreateMap<CreateUserModel, User>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => Guid.NewGuid()))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => DateTime.Now))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => DateTime.Now));

            //Users
            CreateMap<UserViewModel, User>().ReverseMap();

            //Reviews
            CreateMap<CreateUserReviewViewModel, UserReview>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => Guid.NewGuid()))
                .ForMember(dest => dest.UpVotes, opt => opt.MapFrom(src => 0))
                .ForMember(dest => dest.DownVotes, opt => opt.MapFrom(src => 0))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => DateTime.Now))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => DateTime.Now));

            CreateMap<UserReplyViewModel, UserReview>()
                 .ForMember(dest => dest.Id, opt => opt.MapFrom(src => Guid.NewGuid()))
                 .ForMember(dest => dest.UpVotes, opt => opt.MapFrom(src => 0))
                 .ForMember(dest => dest.DownVotes, opt => opt.MapFrom(src => 0))
                 .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => DateTime.Now))
                 .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => DateTime.Now));

            CreateMap<ReviewVoteViewModel, ReviewVote>()
                 .ForMember(dest => dest.Id, opt => opt.MapFrom(src => Guid.NewGuid()))
                 .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => DateTime.Now))
                 .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => DateTime.Now));

        }
    }
}
