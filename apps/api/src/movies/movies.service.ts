import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { movieSummary } from '../common/movie-presenter';
import { PrismaService } from '../prisma.service';

type TmdbSearchMovie = {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  adult?: boolean;
  genre_ids?: number[];
};

type TmdbMovieDetails = TmdbSearchMovie & {
  imdb_id?: string | null;
  runtime?: number | null;
  status?: string | null;
  genres?: { id: number; name: string }[];
};

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async search(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const local = await this.prisma.movie.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      orderBy: [{ popularity: 'desc' }, { releaseDate: 'desc' }],
      take: 8,
    });

    const token = this.config.get<string>('TMDB_ACCESS_TOKEN');
    if (!token || local.length >= 5) {
      return { items: local.map(movieSummary), source: token ? 'local' : 'local-only' };
    }

    try {
      const remote = await this.tmdbSearch(q, token);
      const localTmdbIds = new Set(local.map((movie) => movie.tmdbId));
      const remoteItems = remote
        .filter((movie) => !localTmdbIds.has(movie.id))
        .slice(0, 8 - local.length)
        .map((movie) => this.presentTmdbMovie(movie));
      return { items: [...local.map(movieSummary), ...remoteItems], source: 'local+tmdb' };
    } catch {
      if (local.length) {
        return { items: local.map(movieSummary), source: 'local-after-tmdb-failure' };
      }
      throw new ServiceUnavailableException('TMDB search is unavailable');
    }
  }

  async getMovie(id: string) {
    const movie = await this.prisma.movie.findUniqueOrThrow({ where: { id } });
    return movieSummary(movie);
  }

  async importTmdbMovie(tmdbId: number) {
    const token = this.config.get<string>('TMDB_ACCESS_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException('TMDB_ACCESS_TOKEN is required to import movies');
    }

    const details = await this.tmdbDetails(tmdbId, token);
    const movie = await this.upsertTmdbMovie(details);
    return movieSummary(movie);
  }

  private async tmdbSearch(query: string, token: string): Promise<TmdbSearchMovie[]> {
    const params = new URLSearchParams({
      query,
      include_adult: 'false',
      language: this.config.get<string>('TMDB_DEFAULT_LANGUAGE') ?? 'en-US',
      page: '1',
    });
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`TMDB search failed: ${response.status}`);
    }
    const data = (await response.json()) as { results?: TmdbSearchMovie[] };
    return data.results ?? [];
  }

  private async tmdbDetails(tmdbId: number, token: string): Promise<TmdbMovieDetails> {
    const params = new URLSearchParams({
      language: this.config.get<string>('TMDB_DEFAULT_LANGUAGE') ?? 'en-US',
    });
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`TMDB movie lookup failed: ${response.status}`);
    }
    return (await response.json()) as TmdbMovieDetails;
  }

  private async upsertTmdbMovie(details: TmdbMovieDetails) {
    const releaseDate = details.release_date ? new Date(`${details.release_date}T00:00:00.000Z`) : null;
    const data: Prisma.MovieUncheckedCreateInput = {
      tmdbId: details.id,
      imdbId: details.imdb_id ?? null,
      title: details.title,
      originalTitle: details.original_title ?? details.title,
      overview: details.overview ?? null,
      releaseDate,
      runtimeMinutes: details.runtime ?? null,
      originalLanguage: details.original_language ?? null,
      posterPath: details.poster_path ?? null,
      backdropPath: details.backdrop_path ?? null,
      tmdbVoteAverage: details.vote_average ?? null,
      tmdbVoteCount: details.vote_count ?? null,
      popularity: details.popularity ?? null,
      status: details.status ?? null,
      adult: details.adult ?? false,
      lastSyncedAt: new Date(),
    };

    const movie = await this.prisma.movie.upsert({
      where: { tmdbId: details.id },
      create: data,
      update: data,
    });

    for (const genre of details.genres ?? []) {
      await this.prisma.movieGenre.upsert({
        where: { tmdbId: genre.id },
        create: { tmdbId: genre.id, name: genre.name },
        update: { name: genre.name },
      });
      await this.prisma.movieGenreLink.upsert({
        where: { movieId_genreTmdbId: { movieId: movie.id, genreTmdbId: genre.id } },
        create: { movieId: movie.id, genreTmdbId: genre.id },
        update: {},
      });
    }

    return movie;
  }

  private presentTmdbMovie(movie: TmdbSearchMovie) {
    return {
      id: undefined,
      tmdbId: movie.id,
      title: movie.title,
      releaseYear: movie.release_date ? new Date(`${movie.release_date}T00:00:00.000Z`).getUTCFullYear() : null,
      overview: movie.overview ?? null,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : null,
    };
  }
}
