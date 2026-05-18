import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { ReviewsService } from '../src/reviews/reviews.service';

function createMockPrisma() {
  return {
    movie: { findUnique: vi.fn() },
    review: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    reviewRevision: { create: vi.fn() },
    comment: { findFirst: vi.fn(), create: vi.fn() },
    commentVote: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
  };
}

let mockTx: ReturnType<typeof createMockTx>;

function createMockTx() {
  return {
    reviewRevision: { create: vi.fn() },
    review: { update: vi.fn() },
    commentVote: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    comment: { findUnique: vi.fn(), update: vi.fn() },
  };
}

function createMockVisibility() {
  return {
    canSeeReview: vi.fn().mockResolvedValue(true),
    acceptedFriendIds: vi.fn().mockResolvedValue([]),
    isBlockedEitherWay: vi.fn().mockResolvedValue(false),
  };
}

const baseReview = {
  id: 'review-1',
  userId: 'user-1',
  movieId: 'movie-1',
  rating: 4.5,
  quickTake: 'Great!',
  body: null,
  tags: ['fun'],
  containsSpoilers: false,
  visibility: 'friends' as const,
  createdAt: new Date('2026-05-17T10:00:00Z'),
  updatedAt: new Date('2026-05-17T10:00:00Z'),
  deletedAt: null,
  user: { id: 'user-1', username: 'alice', displayName: 'Alice', avatarUrl: null },
  movie: {
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
  },
  comments: [],
  _count: { comments: 0 },
  revisions: [],
};

describe('ReviewsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let service: ReviewsService;

  beforeEach(() => {
    mockTx = createMockTx();
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    service = new ReviewsService(prisma as never, visibility as never);
  });

  describe('create', () => {
    const dto = {
      movieId: 'movie-1',
      rating: 4.5,
      quickTake: 'Great!',
      containsSpoilers: false,
    };

    it('creates a review successfully', async () => {
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-1' });
      prisma.review.create.mockResolvedValue(baseReview);

      const result = await service.create('user-1', dto);
      expect(result.id).toBe('review-1');
      expect(result.rating).toBe(4.5);
      expect(prisma.review.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when movie does not exist', async () => {
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', dto)).rejects.toThrow('Movie not found');
    });

    it('throws ConflictException for duplicate active review', async () => {
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-1' });
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.8.2',
      });
      prisma.review.create.mockRejectedValue(error);

      await expect(service.create('user-1', dto)).rejects.toThrow('You already reviewed this movie');
    });
  });

  describe('update', () => {
    it('creates a revision and updates the review', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);
      mockTx.reviewRevision.create.mockResolvedValue({});
      mockTx.review.update.mockResolvedValue({ ...baseReview, rating: 3.0 });

      const result = await service.update('user-1', 'review-1', { rating: 3.0 });
      expect(result.rating).toBe(3.0);
    });

    it('forbids editing another user review', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);

      await expect(service.update('user-2', 'review-1', { rating: 3.0 })).rejects.toThrow(
        'You can only edit your own reviews',
      );
    });

    it('throws NotFoundException for deleted review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        ...baseReview,
        deletedAt: new Date(),
      });

      await expect(service.update('user-1', 'review-1', { rating: 3.0 })).rejects.toThrow(
        'Review not found',
      );
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt on the review', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);
      prisma.review.update.mockResolvedValue({});

      const result = await service.softDelete('user-1', 'review-1');
      expect(result).toEqual({ ok: true });
    });

    it('forbids deleting another user review', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);

      await expect(service.softDelete('user-2', 'review-1')).rejects.toThrow(
        'You can only delete your own reviews',
      );
    });
  });

  describe('get (visibility)', () => {
    it('returns the review when viewer can see it', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);
      visibility.canSeeReview.mockResolvedValue(true);

      const result = await service.get('user-2', 'review-1');
      expect(result.id).toBe('review-1');
    });

    it('throws NotFoundException when viewer is blocked', async () => {
      prisma.review.findUnique.mockResolvedValue(baseReview);
      visibility.canSeeReview.mockResolvedValue(false);

      await expect(service.get('user-2', 'review-1')).rejects.toThrow('Review not found');
    });

    it('throws NotFoundException for deleted review', async () => {
      prisma.review.findUnique.mockResolvedValue({
        ...baseReview,
        deletedAt: new Date(),
      });
      visibility.canSeeReview.mockResolvedValue(false);

      await expect(service.get('user-2', 'review-1')).rejects.toThrow('Review not found');
    });
  });
});
