import { describe, expect, it, vi } from 'vitest';
import { ReviewsService } from '../src/reviews/reviews.service';

describe('ReviewsService voteComment', () => {
  it('removes an existing same-direction vote and restores the score', async () => {
    const now = new Date('2026-05-17T12:00:00.000Z');
    const returnedComment = {
      id: 'comment-id',
      reviewId: 'review-id',
      parentCommentId: null,
      body: 'Agreed',
      depth: 0,
      score: 0,
      createdAt: now,
      updatedAt: now,
      user: {
        id: 'author-id',
        username: 'author',
        displayName: 'Author',
        avatarUrl: null,
      },
      votes: [],
    };
    const tx = {
      commentVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        delete: vi.fn().mockResolvedValue({}),
        upsert: vi.fn(),
      },
      comment: {
        update: vi.fn().mockResolvedValue(returnedComment),
      },
    };
    const prisma = {
      comment: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'comment-id',
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
    const service = new ReviewsService(prisma as never, visibility as never);

    const result = await service.voteComment('viewer-id', 'review-id', 'comment-id', 1);

    expect(tx.commentVote.delete).toHaveBeenCalledWith({
      where: { commentId_userId: { commentId: 'comment-id', userId: 'viewer-id' } },
    });
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
});
