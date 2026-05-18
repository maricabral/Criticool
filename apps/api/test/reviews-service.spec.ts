import { describe, expect, it, vi } from 'vitest';
import { ReviewsService } from '../src/reviews/reviews.service';

describe('ReviewsService voteComment', () => {
  const now = new Date('2026-05-17T12:00:00.000Z');

  function comment(score: number, vote?: -1 | 1) {
    return {
      id: 'comment-id',
      reviewId: 'review-id',
      parentCommentId: null,
      body: 'Agreed',
      depth: 0,
      score,
      createdAt: now,
      updatedAt: now,
      user: {
        id: 'author-id',
        username: 'author',
        displayName: 'Author',
        avatarUrl: null,
      },
      votes: vote ? [{ value: vote }] : [],
    };
  }

  function serviceWithTransaction(tx: unknown) {
    const prisma = {
      comment: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'comment-id',
          userId: 'author-id',
          review: {
            userId: 'review-author-id',
            visibility: 'friends',
            deletedAt: null,
          },
        }),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const visibility = {
      canSeeReview: vi.fn().mockResolvedValue(true),
    };

    return new ReviewsService(prisma as never, visibility as never);
  }

  it('leaves an existing same-direction vote unchanged', async () => {
    const returnedComment = comment(1, 1);
    const tx = {
      commentVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        delete: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      comment: {
        findUnique: vi.fn().mockResolvedValue(returnedComment),
        update: vi.fn(),
      },
    };
    const service = serviceWithTransaction(tx);

    const result = await service.voteComment('viewer-id', 'review-id', 'comment-id', 1);

    expect(tx.commentVote.delete).not.toHaveBeenCalled();
    expect(tx.commentVote.upsert).not.toHaveBeenCalled();
    expect(tx.comment.update).not.toHaveBeenCalled();
    expect(result.score).toBe(1);
    expect(result.viewerVote).toBe(1);
  });

  it('clears an existing opposite-direction vote before a new vote can be applied', async () => {
    const returnedComment = comment(0);
    const tx = {
      commentVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        delete: vi.fn().mockResolvedValue({}),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      comment: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(returnedComment),
      },
    };
    const service = serviceWithTransaction(tx);

    const result = await service.voteComment('viewer-id', 'review-id', 'comment-id', -1);

    expect(tx.commentVote.delete).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: 'comment-id', userId: 'viewer-id' } },
    });
    expect(tx.commentVote.update).not.toHaveBeenCalled();
    expect(tx.commentVote.upsert).not.toHaveBeenCalled();
    expect(tx.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comment-id' },
        data: { score: { increment: -1 } },
      }),
    );
    expect(result.score).toBe(0);
    expect(result.viewerVote).toBe(0);
  });

  it('creates a vote when the viewer has no existing vote', async () => {
    const returnedComment = comment(-1, -1);
    const tx = {
      commentVote: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn(),
      },
      comment: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(returnedComment),
      },
    };
    const service = serviceWithTransaction(tx);

    const result = await service.voteComment('viewer-id', 'review-id', 'comment-id', -1);

    expect(tx.commentVote.delete).not.toHaveBeenCalled();
    expect(tx.commentVote.upsert).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: 'comment-id', userId: 'viewer-id' } },
      create: { commentId: 'comment-id', userId: 'viewer-id', value: -1 },
      update: { value: -1 },
    });
    expect(tx.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comment-id' },
        data: { score: { increment: -1 } },
      }),
    );
    expect(result.score).toBe(-1);
    expect(result.viewerVote).toBe(-1);
  });

  it('removes an existing vote and adjusts score', async () => {
    const returnedComment = comment(0);
    const tx = {
      commentVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        delete: vi.fn().mockResolvedValue({}),
      },
      comment: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(returnedComment),
      },
    };
    const service = serviceWithTransaction(tx);

    const result = await service.removeCommentVote('viewer-id', 'review-id', 'comment-id');

    expect(tx.commentVote.delete).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: 'comment-id', userId: 'viewer-id' } },
    });
    expect(tx.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comment-id' },
        data: { score: { increment: -1 } },
      }),
    );
    expect(result.score).toBe(0);
    expect(result.viewerVote).toBe(0);
  });
});
