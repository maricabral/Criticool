import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FriendshipsService } from '../src/friendships/friendships.service';

function createMockPrisma() {
  return {
    friendship: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    block: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notification: {
      deleteMany: vi.fn(),
    },
  };
}

function createMockVisibility() {
  return {
    isBlockedEitherWay: vi.fn().mockResolvedValue(false),
    acceptedFriendIds: vi.fn().mockResolvedValue([]),
  };
}

function createMockNotifications() {
  return {
    create: vi.fn().mockResolvedValue(null),
  };
}

const userA = { id: 'user-a', username: 'alice', displayName: 'Alice', avatarUrl: null };
const userB = { id: 'user-b', username: 'bob', displayName: 'Bob', avatarUrl: null };

describe('FriendshipsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let notifications: ReturnType<typeof createMockNotifications>;
  let service: FriendshipsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    notifications = createMockNotifications();
    service = new FriendshipsService(prisma as never, visibility as never, notifications as never);
  });

  describe('createRequest', () => {
    it('creates a pending friend request', async () => {
      prisma.friendship.findFirst.mockResolvedValue(null);
      prisma.friendship.create.mockResolvedValue({
        id: 'fr-1',
        status: 'pending',
        requester: userA,
        addressee: userB,
        createdAt: new Date('2026-05-17T10:00:00Z'),
        respondedAt: null,
      });

      const result = await service.createRequest('user-a', 'user-b');
      expect(result.status).toBe('pending');
      expect(result.requester.id).toBe('user-a');
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-b',
          actorId: 'user-a',
          type: 'friend_request_received',
        }),
      );
    });

    it('rejects self-request', async () => {
      await expect(service.createRequest('user-a', 'user-a')).rejects.toThrow(
        'You cannot friend yourself',
      );
    });

    it('returns existing pending request without creating duplicate', async () => {
      prisma.friendship.findFirst.mockResolvedValue({
        id: 'fr-1',
        status: 'pending',
        requesterId: 'user-a',
        addresseeId: 'user-b',
        requester: userA,
        addressee: userB,
        createdAt: new Date('2026-05-17T10:00:00Z'),
        respondedAt: null,
      });

      const result = await service.createRequest('user-a', 'user-b');
      expect(result.status).toBe('pending');
      expect(prisma.friendship.create).not.toHaveBeenCalled();
    });

    it('re-sends a declined request as pending', async () => {
      prisma.friendship.findFirst.mockResolvedValue({
        id: 'fr-1',
        status: 'declined',
        requesterId: 'user-b',
        addresseeId: 'user-a',
        requester: userB,
        addressee: userA,
        createdAt: new Date('2026-05-15T10:00:00Z'),
        respondedAt: new Date('2026-05-16T10:00:00Z'),
      });
      prisma.friendship.update.mockResolvedValue({
        id: 'fr-1',
        status: 'pending',
        requesterId: 'user-a',
        addresseeId: 'user-b',
        requester: userA,
        addressee: userB,
        createdAt: new Date('2026-05-15T10:00:00Z'),
        respondedAt: null,
      });

      const result = await service.createRequest('user-a', 'user-b');
      expect(result.status).toBe('pending');
      expect(prisma.friendship.update).toHaveBeenCalled();
    });

    it('hides user if blocked either way', async () => {
      visibility.isBlockedEitherWay.mockResolvedValue(true);

      await expect(service.createRequest('user-a', 'user-b')).rejects.toThrow('User not found');
    });
  });

  describe('accept', () => {
    it('accepts a pending request', async () => {
      prisma.friendship.findFirst.mockResolvedValue({
        id: 'fr-1',
        requesterId: 'user-a',
        addresseeId: 'user-b',
        status: 'pending',
      });
      prisma.friendship.update.mockResolvedValue({
        id: 'fr-1',
        status: 'accepted',
        requester: userA,
        addressee: userB,
        createdAt: new Date(),
        respondedAt: new Date(),
      });

      const result = await service.accept('user-b', 'fr-1');
      expect(result.status).toBe('accepted');
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-a',
          actorId: 'user-b',
          type: 'friend_request_accepted',
        }),
      );
    });

    it('throws NotFoundException for non-existent request', async () => {
      prisma.friendship.findFirst.mockResolvedValue(null);

      await expect(service.accept('user-b', 'fr-999')).rejects.toThrow(
        'Friend request not found',
      );
    });
  });

  describe('decline', () => {
    it('declines a pending request', async () => {
      prisma.friendship.findFirst.mockResolvedValue({
        id: 'fr-1',
        addresseeId: 'user-b',
        status: 'pending',
      });
      prisma.friendship.update.mockResolvedValue({
        id: 'fr-1',
        status: 'declined',
        requester: userA,
        addressee: userB,
        createdAt: new Date(),
        respondedAt: new Date(),
      });

      const result = await service.decline('user-b', 'fr-1');
      expect(result.status).toBe('declined');
    });

    it('throws NotFoundException for non-existent request', async () => {
      prisma.friendship.findFirst.mockResolvedValue(null);

      await expect(service.decline('user-b', 'fr-999')).rejects.toThrow(
        'Friend request not found',
      );
    });
  });

  describe('cancel', () => {
    it('cancels an outgoing pending request', async () => {
      prisma.friendship.findFirst.mockResolvedValue({
        id: 'fr-1',
        requesterId: 'user-a',
        addresseeId: 'user-b',
        status: 'pending',
      });
      prisma.friendship.delete.mockResolvedValue({});
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.cancel('user-a', 'fr-1');

      expect(result).toEqual({ ok: true });
      expect(prisma.friendship.delete).toHaveBeenCalledWith({ where: { id: 'fr-1' } });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { friendshipId: 'fr-1', type: 'friend_request_received' },
      });
    });

    it('does not cancel someone else pending request', async () => {
      prisma.friendship.findFirst.mockResolvedValue(null);

      await expect(service.cancel('user-b', 'fr-1')).rejects.toThrow(
        'Friend request not found',
      );
    });
  });

  describe('friends', () => {
    it('returns friend list from accepted friendships', async () => {
      prisma.friendship.findMany.mockResolvedValue([
        {
          requesterId: 'user-a',
          addresseeId: 'user-b',
          requester: userA,
          addressee: userB,
          status: 'accepted',
        },
      ]);

      const result = await service.friends('user-a');
      expect(result).toEqual([
        { id: 'user-b', username: 'bob', displayName: 'Bob', avatarUrl: null },
      ]);
    });

    it('hides blocked friendships from the friend list', async () => {
      prisma.friendship.findMany.mockResolvedValue([
        {
          requesterId: 'user-a',
          addresseeId: 'user-b',
          requester: userA,
          addressee: userB,
          status: 'accepted',
        },
      ]);
      prisma.block.findMany.mockResolvedValue([{ blockerId: 'user-a', blockedId: 'user-b' }]);

      const result = await service.friends('user-a');

      expect(result).toEqual([]);
    });
  });
});
