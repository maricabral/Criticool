import { Injectable } from '@nestjs/common';
import { ReviewVisibility } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type VisibilityInput = {
  viewerId: string;
  authorId: string;
  visibility: ReviewVisibility;
  deletedAt?: Date | null;
};

export function canSeeReviewDirect(args: VisibilityInput & { areFriends: boolean; isBlocked: boolean }) {
  if (args.deletedAt || args.isBlocked) {
    return false;
  }
  if (args.viewerId === args.authorId) {
    return true;
  }
  if (args.visibility === 'private') {
    return false;
  }
  return args.areFriends;
}

@Injectable()
export class VisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async canSeeReview(args: VisibilityInput) {
    const [areFriends, isBlocked] = await Promise.all([
      this.areFriends(args.viewerId, args.authorId),
      this.isBlockedEitherWay(args.viewerId, args.authorId),
    ]);
    return canSeeReviewDirect({ ...args, areFriends, isBlocked });
  }

  async areFriends(userAId: string, userBId: string) {
    if (userAId === userBId) {
      return true;
    }
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userAId, addresseeId: userBId },
          { requesterId: userBId, addresseeId: userAId },
        ],
      },
      select: { id: true },
    });
    return Boolean(friendship);
  }

  async isBlockedEitherWay(userAId: string, userBId: string) {
    if (userAId === userBId) {
      return false;
    }
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
      select: { blockerId: true },
    });
    return Boolean(block);
  }

  async acceptedFriendIds(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    return rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
  }
}
