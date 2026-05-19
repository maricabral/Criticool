import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FeedService } from '../src/feed/feed.service';

function createMockPrisma() {
  return {
    block: { findMany: vi.fn().mockResolvedValue([]) },
    review: { findMany: vi.fn() },
  };
}

function createMockVisibility() {
  return {
    acceptedFriendIds: vi.fn().mockResolvedValue([]),
  };
}

const movie = {
  id: 'movie-1',
  tmdbId: 100,
  title: 'Test Movie',
  releaseDate: new Date('2026-01-01'),
  posterPath: '/poster.jpg',
  backdropPath: null,
  overview: 'A test',
  originalTitle: 'Test Movie',
  imdbId: null,
  runtimeMinutes: 120,
  originalLanguage: 'en',
  tmdbVoteAverage: 7.5,
  tmdbVoteCount: 1000,
  popularity: 50.0,
  status: 'Released',
  adult: false,
  lastSyncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    userId: 'user-1',
    movieId: 'movie-1',
    rating: 4.0,
    quickTake: 'Nice',
    body: null,
    tags: [],
    containsSpoilers: false,
    visibility: 'friends',
    createdAt: new Date('2026-05-17T10:00:00Z'),
    updatedAt: new Date('2026-05-17T10:00:00Z'),
    deletedAt: null,
    user: { id: 'user-1', username: 'alice', displayName: 'Alice', avatarUrl: null },
    movie,
    comments: [],
    _count: { comments: 0 },
    ...overrides,
  };
}

describe('FeedService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let service: FeedService;

  beforeEach(() => {
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    service = new FeedService(prisma as never, visibility as never);
  });

  describe('feed', () => {
    it('returns own reviews in the feed', async () => {
      visibility.acceptedFriendIds.mockResolvedValue([]);
      prisma.review.findMany.mockResolvedValue([makeReview()]);

      const result = await service.feed('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].reviewId).toBe('review-1');
    });

    it('includes friend reviews in the feed', async () => {
      visibility.acceptedFriendIds.mockResolvedValue(['user-2']);
      prisma.review.findMany.mockResolvedValue([
        makeReview({ id: 'review-2', userId: 'user-2' }),
      ]);

      const result = await service.feed('user-1');
      expect(result.items).toHaveLength(1);
    });

    it('excludes blocked users from feed', async () => {
      visibility.acceptedFriendIds.mockResolvedValue(['user-3']);
      prisma.block.findMany.mockResolvedValue([{ blockerId: 'user-1', blockedId: 'user-3' }]);
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.feed('user-1');
      expect(result.items).toHaveLength(0);
      // Verify the query filters out blocked user
      const queryWhere = prisma.review.findMany.mock.calls[0][0].where;
      expect(queryWhere.userId.in).not.toContain('user-3');
    });

    it('does not include stranger reviews', async () => {
      visibility.acceptedFriendIds.mockResolvedValue([]);
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.feed('user-1');
      expect(result.items).toHaveLength(0);
      // Only own reviews should be queried
      const queryWhere = prisma.review.findMany.mock.calls[0][0].where;
      expect(queryWhere.userId.in).toEqual(['user-1']);
    });

    it('does not show deleted reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);

      const result = await service.feed('user-1');
      const queryWhere = prisma.review.findMany.mock.calls[0][0].where;
      expect(queryWhere.deletedAt).toBeNull();
    });

    it('returns commentCount from _count', async () => {
      prisma.review.findMany.mockResolvedValue([
        makeReview({ _count: { comments: 5 } }),
      ]);

      const result = await service.feed('user-1');
      expect(result.items[0].commentCount).toBe(5);
    });

    it('filters blocked comment authors from feed counts and participants', async () => {
      prisma.block.findMany.mockResolvedValue([{ blockerId: 'user-1', blockedId: 'blocked-1' }]);
      prisma.review.findMany.mockResolvedValue([
        makeReview({
          comments: [
            {
              user: {
                id: 'friend-1',
                username: 'friend',
                displayName: 'Friend',
                avatarUrl: null,
              },
            },
          ],
          _count: { comments: 1 },
        }),
      ]);

      const result = await service.feed('user-1');
      const query = prisma.review.findMany.mock.calls[0][0];

      expect(query.include.comments.where.userId.notIn).toEqual(['blocked-1']);
      expect(query.include._count.select.comments.where.userId.notIn).toEqual(['blocked-1']);
      expect(result.items[0].commentCount).toBe(1);
      expect(result.items[0].commentParticipants.map((user) => user.id)).toEqual(['friend-1']);
    });

    it('paginates with cursor', async () => {
      prisma.review.findMany.mockResolvedValue(
        Array.from({ length: 21 }, (_, index) =>
          makeReview({
            id: `review-${index + 1}`,
            createdAt: new Date(`2026-05-17T10:${String(59 - index).padStart(2, '0')}:00Z`),
          }),
        ),
      );

      const result = await service.feed('user-1');
      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBeTruthy();
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 21 }),
      );
    });
  });

  describe('userReviews', () => {
    it('returns only the target user reviews', async () => {
      prisma.review.findMany.mockResolvedValue([makeReview()]);

      const result = await service.userReviews('user-1');
      expect(result.items).toHaveLength(1);
      const queryWhere = prisma.review.findMany.mock.calls[0][0].where;
      expect(queryWhere.userId).toBe('user-1');
    });
  });
});
