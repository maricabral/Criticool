import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';

@Injectable()
export class FriendshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async createRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot friend yourself');
    }
    if (await this.visibility.isBlockedEitherWay(requesterId, addresseeId)) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
      include: this.friendshipInclude(),
    });
    if (existing) {
      if (existing.status === 'declined') {
        return this.present(
          await this.prisma.friendship.update({
            where: { id: existing.id },
            data: { requesterId, addresseeId, status: 'pending', respondedAt: null },
            include: this.friendshipInclude(),
          }),
        );
      }
      return this.present(existing);
    }

    try {
      const request = await this.prisma.friendship.create({
        data: { requesterId, addresseeId },
        include: this.friendshipInclude(),
      });
      return this.present(request);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException('User not found');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Friend request already exists');
      }
      throw error;
    }
  }

  async incoming(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: this.friendshipInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.present(row));
  }

  async outgoing(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { requesterId: userId, status: 'pending' },
      include: this.friendshipInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.present(row));
  }

  async accept(userId: string, requestId: string) {
    const request = await this.prisma.friendship.findFirst({
      where: { id: requestId, addresseeId: userId, status: 'pending' },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    return this.present(
      await this.prisma.friendship.update({
        where: { id: request.id },
        data: { status: 'accepted', respondedAt: new Date() },
        include: this.friendshipInclude(),
      }),
    );
  }

  async decline(userId: string, requestId: string) {
    const request = await this.prisma.friendship.findFirst({
      where: { id: requestId, addresseeId: userId, status: 'pending' },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    return this.present(
      await this.prisma.friendship.update({
        where: { id: request.id },
        data: { status: 'declined', respondedAt: new Date() },
        include: this.friendshipInclude(),
      }),
    );
  }

  async friends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: this.friendshipInclude(),
      orderBy: { respondedAt: 'desc' },
    });
    return rows.map((row) => {
      const friend = row.requesterId === userId ? row.addressee : row.requester;
      return { id: friend.id, username: friend.username, displayName: friend.displayName, avatarUrl: friend.avatarUrl };
    });
  }

  private friendshipInclude() {
    return {
      requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    } satisfies Prisma.FriendshipInclude;
  }

  private present(
    friendship: Prisma.FriendshipGetPayload<{
      include: ReturnType<FriendshipsService['friendshipInclude']>;
    }>,
  ) {
    return {
      id: friendship.id,
      status: friendship.status,
      requester: friendship.requester,
      addressee: friendship.addressee,
      createdAt: friendship.createdAt.toISOString(),
      respondedAt: friendship.respondedAt?.toISOString() ?? null,
    };
  }
}
