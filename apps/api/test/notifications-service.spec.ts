import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsService } from '../src/notifications/notifications.service';

function createMockPrisma() {
  return {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

const actor = { id: 'actor-1', username: 'alice', displayName: 'Alice', avatarUrl: null };

describe('NotificationsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new NotificationsService(prisma as never);
  });

  it('does not create self-notifications', async () => {
    const result = await service.create({
      recipientId: 'user-1',
      actorId: 'user-1',
      type: 'comment_replied',
      reviewId: 'review-1',
      commentId: 'comment-1',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('lists notifications with unread count', async () => {
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'notification-1',
        type: 'review_commented',
        reviewId: 'review-1',
        commentId: 'comment-1',
        friendshipId: null,
        readAt: null,
        createdAt: new Date('2026-05-18T10:00:00Z'),
        actor,
      },
      {
        id: 'notification-2',
        type: 'friend_request_accepted',
        reviewId: null,
        commentId: null,
        friendshipId: 'friendship-1',
        readAt: new Date('2026-05-18T10:05:00Z'),
        createdAt: new Date('2026-05-18T09:00:00Z'),
        actor,
      },
    ]);

    const result = await service.list('user-1');

    expect(result.unreadCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'notification-1',
      type: 'review_commented',
      readAt: null,
      actor,
    });
  });

  it('marks one notification read only for the owner', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      recipientId: 'user-1',
      readAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      type: 'comment_voted',
      reviewId: 'review-1',
      commentId: 'comment-1',
      friendshipId: null,
      readAt: new Date('2026-05-18T10:00:00Z'),
      createdAt: new Date('2026-05-18T09:00:00Z'),
      actor,
    });

    const result = await service.markRead('user-1', 'notification-1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', recipientId: 'user-1' },
    });
    expect(result.readAt).toBe('2026-05-18T10:00:00.000Z');
  });
});
