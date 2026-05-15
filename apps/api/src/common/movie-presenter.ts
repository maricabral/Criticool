import { Movie } from '@prisma/client';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null | undefined) {
  return path ? `${TMDB_IMAGE_BASE}/w342${path}` : null;
}

export function backdropUrl(path: string | null | undefined) {
  return path ? `${TMDB_IMAGE_BASE}/w780${path}` : null;
}

export function releaseYear(date: Date | string | null | undefined) {
  if (!date) {
    return null;
  }
  return new Date(date).getUTCFullYear();
}

export function movieSummary(movie: Pick<Movie, 'id' | 'tmdbId' | 'title' | 'overview' | 'releaseDate' | 'posterPath' | 'backdropPath'>) {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    releaseYear: releaseYear(movie.releaseDate),
    overview: movie.overview,
    posterUrl: posterUrl(movie.posterPath),
    backdropUrl: backdropUrl(movie.backdropPath),
  };
}
