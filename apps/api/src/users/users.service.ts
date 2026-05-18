import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(viewerId: string, query: string) {
    const q = query.trim().toLowerCase();
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId },
        deletedAt: null,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
        blocksMade: { none: { blockedId: viewerId } },
        blocksReceived: { none: { blockerId: viewerId } },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        requestedFriendships: {
          where: { addresseeId: viewerId },
          select: { status: true },
          take: 1,
        },
        receivedFriendships: {
          where: { requesterId: viewerId },
          select: { status: true },
          take: 1,
        },
      },
      take: 20,
      orderBy: { username: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      friendshipStatus:
        user.requestedFriendships[0]?.status ?? user.receivedFriendships[0]?.status ?? null,
    }));
  }

  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: targetUserId },
            { requesterId: targetUserId, addresseeId: userId },
          ],
        },
      }),
      this.prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
        create: { blockerId: userId, blockedId: targetUserId },
        update: {},
      }),
    ]);

    return { ok: true };
  }

  async unblock(userId: string, targetUserId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId: userId, blockedId: targetUserId },
    });

    return { ok: true };
  }
}
