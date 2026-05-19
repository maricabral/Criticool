import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationsService } from '../src/translations/translations.service';

function createMockPrisma() {
  return {
    review: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn() },
    translationCache: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
  };
}

function createMockVisibility() {
  return {
    canSeeReview: vi.fn().mockResolvedValue(true),
    isBlockedEitherWay: vi.fn().mockResolvedValue(false),
  };
}

function createMockAdapter() {
  return {
    providerName: 'fake',
    translate: vi.fn(async ({ fields }) => ({
      quickTake: fields.quickTake ? `pt:${fields.quickTake}` : null,
      body: fields.body ? `pt:${fields.body}` : null,
    })),
  };
}

const review = {
  id: 'review-1',
  userId: 'author-1',
  visibility: 'friends' as const,
  deletedAt: null,
  updatedAt: new Date('2026-05-18T10:00:00.000Z'),
  quickTake: 'Great',
  body: 'Loved it',
};

const comment = {
  id: 'comment-1',
  userId: 'commenter-1',
  body: 'Agree',
  updatedAt: new Date('2026-05-18T11:00:00.000Z'),
  deletedAt: null,
  review: {
    userId: 'author-1',
    visibility: 'friends' as const,
    deletedAt: null,
  },
};

describe('TranslationsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let adapter: ReturnType<typeof createMockAdapter>;
  let service: TranslationsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    adapter = createMockAdapter();
    service = new TranslationsService(prisma as never, visibility as never, adapter as never);
  });

  it('translates visible review text and caches by update version', async () => {
    prisma.review.findUnique.mockResolvedValue(review);

    const result = await service.translate('viewer-1', {
      targetType: 'review',
      targetId: 'review-1',
      sourceLocale: 'en-US',
      targetLocale: 'pt-BR',
    });

    expect(result.cached).toBe(false);
    expect(result.fields).toEqual({ quickTake: 'pt:Great', body: 'pt:Loved it' });
    expect(prisma.translationCache.findUnique).toHaveBeenCalledWith({
      where: {
        targetType_targetId_targetVersion_sourceLocale_targetLocale: {
          targetType: 'review',
          targetId: 'review-1',
          targetVersion: '2026-05-18T10:00:00.000Z',
          sourceLocale: 'en-us',
          targetLocale: 'pt-br',
        },
      },
    });
    expect(prisma.translationCache.create).toHaveBeenCalled();
  });

  it('reuses cached translations', async () => {
    prisma.review.findUnique.mockResolvedValue(review);
    prisma.translationCache.findUnique.mockResolvedValue({
      fields: { quickTake: 'cached', body: 'cached body' },
    });

    const result = await service.translate('viewer-1', {
      targetType: 'review',
      targetId: 'review-1',
      targetLocale: 'pt-BR',
    });

    expect(result.cached).toBe(true);
    expect(result.fields.body).toBe('cached body');
    expect(adapter.translate).not.toHaveBeenCalled();
  });

  it('rejects inaccessible reviews', async () => {
    prisma.review.findUnique.mockResolvedValue(review);
    visibility.canSeeReview.mockResolvedValue(false);

    await expect(
      service.translate('viewer-1', {
        targetType: 'review',
        targetId: 'review-1',
        targetLocale: 'pt-BR',
      }),
    ).rejects.toThrow('Review not found');
  });

  it('rejects deleted comments', async () => {
    prisma.comment.findUnique.mockResolvedValue({ ...comment, deletedAt: new Date() });

    await expect(
      service.translate('viewer-1', {
        targetType: 'comment',
        targetId: 'comment-1',
        targetLocale: 'pt-BR',
      }),
    ).rejects.toThrow('Comment not found');
  });

  it('rejects comments from blocked users', async () => {
    prisma.comment.findUnique.mockResolvedValue(comment);
    visibility.isBlockedEitherWay.mockResolvedValue(true);

    await expect(
      service.translate('viewer-1', {
        targetType: 'comment',
        targetId: 'comment-1',
        targetLocale: 'pt-BR',
      }),
    ).rejects.toThrow('Comment not found');
  });
});
