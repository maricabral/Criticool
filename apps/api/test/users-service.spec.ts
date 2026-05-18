import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersService } from '../src/users/users.service';

function createMockPrisma() {
  return {
    user: { findFirst: vi.fn() },
    friendship: { deleteMany: vi.fn() },
    block: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
  };
}

describe('UsersService block controls', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: UsersService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new UsersService(prisma as never);
  });

  it('blocks a user and keeps accepted friendship state restorable', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });
    prisma.block.upsert.mockResolvedValue({});

    const result = await service.block('user-a', 'user-b');

    expect(result).toEqual({ ok: true });
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['pending', 'declined'] },
        OR: [
          { requesterId: 'user-a', addresseeId: 'user-b' },
          { requesterId: 'user-b', addresseeId: 'user-a' },
        ],
      },
    });
    expect(prisma.block.upsert).toHaveBeenCalledWith({
      where: { blockerId_blockedId: { blockerId: 'user-a', blockedId: 'user-b' } },
      create: { blockerId: 'user-a', blockedId: 'user-b' },
      update: {},
    });
  });

  it('rejects blocking yourself', async () => {
    await expect(service.block('user-a', 'user-a')).rejects.toThrow('You cannot block yourself');
  });

  it('lists blocked users', async () => {
    prisma.block.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-05-18T10:00:00Z'),
        blocked: { id: 'user-b', username: 'bob', displayName: 'Bob', avatarUrl: null },
      },
    ]);

    const result = await service.blocked('user-a');

    expect(prisma.block.findMany).toHaveBeenCalledWith({
      where: { blockerId: 'user-a' },
      include: {
        blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      {
        id: 'user-b',
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
        blockedAt: '2026-05-18T10:00:00.000Z',
      },
    ]);
  });
});
