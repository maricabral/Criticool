import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FriendshipsService } from '../src/friendships/friendships.service';

function createMockPrisma() {
  return {
    friendship: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function createMockVisibility() {
  return {
    isBlockedEitherWay: vi.fn().mockResolvedValue(false),
    acceptedFriendIds: vi.fn().mockResolvedValue([]),
  };
}

const userA = { id: 'user-a', username: 'alice', displayName: 'Alice', avatarUrl: null };
const userB = { id: 'user-b', username: 'bob', displayName: 'Bob', avatarUrl: null };

describe('FriendshipsService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let visibility: ReturnType<typeof createMockVisibility>;
  let service: FriendshipsService;

  beforeEach(() => {
    prisma = createMockPrisma();
    visibility = createMockVisibility();
    service = new FriendshipsService(prisma as never, visibility as never);
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
  });
});
