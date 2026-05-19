import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoviesService } from '../src/movies/movies.service';

function createMockPrisma() {
  return {
    movie: { findMany: vi.fn(), findUnique: vi.fn() },
    review: { findFirst: vi.fn(), findMany: vi.fn() },
    block: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

function createMockVisibility() {
  return {
    acceptedFriendIds: vi.fn().mockResolvedValue([]),
  };
}

function createMockConfig(values: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn((key: string) => values[key]),
  };
}

const cachedMovie = {
  id: 'movie-1',
  tmdbId: 100,
  title: 'Cached Comedy',
  releaseDate: new Date('2026-01-01T00:00:00.000Z'),
  posterPath: '/cached.jpg',
  backdropPath: null,
  overview: 'Cached result',
  runtimeMinutes: 101,
  status: 'Released',
  originalLanguage: 'en',
  genres: [],
};

describe('MoviesService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('loads cached movies by TMDB genre id before remote results', async () => {
    const config = createMockConfig({ TMDB_ACCESS_TOKEN: 'token', TMDB_DEFAULT_LANGUAGE: 'en-US' });
    const service = new MoviesService(prisma as never, config as never, createMockVisibility() as never);
    prisma.movie.findMany.mockResolvedValue([cachedMovie]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [
          {
            id: 200,
            title: 'Remote Comedy',
            release_date: '2025-05-01',
            overview: 'Remote result',
            poster_path: '/remote.jpg',
            backdrop_path: null,
          },
        ],
      }),
    });
    global.fetch = fetchMock as never;

    const result = await service.browseGenre(35);

    expect(prisma.movie.findMany).toHaveBeenCalledWith({
      where: { genres: { some: { genreTmdbId: 35 } } },
      orderBy: [{ popularity: 'desc' }, { releaseDate: 'desc' }],
      take: 8,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/discover/movie?'),
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain('with_genres=35');
    expect(result.items.map((movie) => movie.title)).toEqual(['Cached Comedy', 'Remote Comedy']);
    expect(result.source).toBe('local+tmdb');
  });

  it('returns cached genre matches when TMDB is not configured', async () => {
    const config = createMockConfig();
    const service = new MoviesService(prisma as never, config as never, createMockVisibility() as never);
    prisma.movie.findMany.mockResolvedValue([cachedMovie]);
    const fetchMock = vi.fn();
    global.fetch = fetchMock as never;

    const result = await service.browseGenre(27);

    expect(result.source).toBe('local-only');
    expect(result.items).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns authenticated movie detail with viewer and friend reviews', async () => {
    const config = createMockConfig();
    const visibility = createMockVisibility();
    visibility.acceptedFriendIds.mockResolvedValue(['friend-1', 'blocked-friend']);
    const service = new MoviesService(prisma as never, config as never, visibility as never);
    prisma.movie.findUnique.mockResolvedValue({
      ...cachedMovie,
      genres: [{ genre: { name: 'Comedy' } }],
    });
    prisma.block.findMany.mockResolvedValue([
      { blockerId: 'viewer-1', blockedId: 'blocked-friend' },
    ]);
    prisma.review.findFirst.mockResolvedValue({
      id: 'viewer-review',
      rating: 4,
      quickTake: 'Mine',
      body: 'My body',
      tags: ['comfort watch'],
      containsSpoilers: false,
      createdAt: new Date('2026-05-18T10:00:00.000Z'),
      updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      user: { id: 'viewer-1', username: 'me', displayName: 'Me', avatarUrl: null },
    });
    prisma.review.findMany.mockResolvedValue([
      {
        id: 'friend-review',
        rating: 5,
        quickTake: 'Loved it',
        body: null,
        tags: [],
        containsSpoilers: false,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
        user: { id: 'friend-1', username: 'pal', displayName: 'Pal', avatarUrl: null },
      },
    ]);

    const result = await service.getMovie('viewer-1', 'movie-1');

    expect(result.viewerReview?.id).toBe('viewer-review');
    expect(result.friendsReviews).toHaveLength(1);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['friend-1'] },
          visibility: 'friends',
          deletedAt: null,
        }),
      }),
    );
  });
});
