import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersService } from '../src/users/users.service';

function createMockPrisma() {
  return {
    user: { findFirst: vi.fn() },
    friendship: { deleteMany: vi.fn() },
    block: {
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

  it('blocks a user and removes friendship state', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });
    prisma.block.upsert.mockResolvedValue({});

    const result = await service.block('user-a', 'user-b');

    expect(result).toEqual({ ok: true });
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: {
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
});
