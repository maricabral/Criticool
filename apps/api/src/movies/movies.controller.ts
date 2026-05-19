import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { MovieGenreQueryDto, MovieIdParamDto, MovieSearchQueryDto, TmdbIdParamDto } from './dto';
import { MoviesService } from './movies.service';

@Controller('movies')
@UseGuards(AuthGuard)
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Get('search')
  search(@Query() query: MovieSearchQueryDto) {
    return this.movies.search(query.q);
  }

  @Get('genre')
  browseGenre(@Query() query: MovieGenreQueryDto) {
    return this.movies.browseGenre(query.genreId);
  }

  @Get(':id')
  getMovie(@Param() params: MovieIdParamDto) {
    return this.movies.getMovie(params.id);
  }

  @Post('tmdb/:tmdbId/import')
  importTmdbMovie(@Param() params: TmdbIdParamDto) {
    return this.movies.importTmdbMovie(params.tmdbId);
  }
}
