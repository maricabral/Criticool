import { Injectable } from '@nestjs/common';
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
}
