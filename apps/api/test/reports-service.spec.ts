import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReportsService } from '../src/reports/reports.service';

function createMockPrisma() {
  return {
    user: { findFirst: vi.fn() },
    review: { findUnique: vi.fn() },
    comment: { findFirst: vi.fn() },
    report: { create: vi.fn() },
  };
}

function createMockVisibility() {
  return {
    canSeeReview: vi.fn().mockResolvedValue(true),
  };
}

describe('ReportsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let service: ReportsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    service = new ReportsService(prisma as never, visibility as never);
  });

  it('creates a review report when the reporter can see the review', async () => {
    prisma.review.findUnique.mockResolvedValue({
      userId: 'author-1',
      visibility: 'friends',
      deletedAt: null,
    });
    prisma.report.create.mockResolvedValue({
      id: 'report-1',
      targetType: 'review',
      targetId: 'review-1',
      reason: 'spam',
      details: null,
      createdAt: new Date('2026-05-18T10:00:00Z'),
    });

    const result = await service.create('reporter-1', {
      targetType: 'review',
      targetId: 'review-1',
      reason: ' spam ',
    });

    expect(visibility.canSeeReview).toHaveBeenCalled();
    expect(prisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'spam' }),
      }),
    );
    expect(result.id).toBe('report-1');
  });

  it('rejects reporting yourself', async () => {
    await expect(
      service.create('user-1', {
        targetType: 'user',
        targetId: 'user-1',
        reason: 'spam',
      }),
    ).rejects.toThrow('You cannot report yourself');
  });
});
