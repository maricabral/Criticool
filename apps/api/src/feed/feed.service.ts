import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decodeCursor, encodeCursor } from '../common/ids';
import { movieSummary } from '../common/movie-presenter';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';

const PAGE_SIZE = 20;

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async feed(userId: string, cursor?: string) {
    const friendIds = await this.visibility.acceptedFriendIds(userId);
    const visibleAuthorIds = [userId, ...friendIds];
    const parsedCursor = decodeCursor(cursor);

    const blockedRows = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedUserIds = new Set(
      blockedRows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)),
    );

    const reviews = await this.prisma.review.findMany({
      where: {
        userId: { in: visibleAuthorIds.filter((id) => !blockedUserIds.has(id)) },
        deletedAt: null,
        OR: parsedCursor
          ? [
              { createdAt: { lt: parsedCursor.createdAt } },
              { createdAt: parsedCursor.createdAt, id: { lt: parsedCursor.id } },
            ]
          : undefined,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        movie: true,
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    });

    const page = reviews.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map((review) => this.presentFeedItem(review)),
      nextCursor: reviews.length > PAGE_SIZE && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async userReviews(userId: string, cursor?: string) {
    return this.reviewsByUser(userId, cursor);
  }

  async userReviewsForViewer(viewerId: string, targetUserId: string, cursor?: string) {
    if (viewerId === targetUserId) {
      return this.userReviews(targetUserId, cursor);
    }

    const [target, areFriends, isBlocked] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true },
      }),
      this.visibility.areFriends(viewerId, targetUserId),
      this.visibility.isBlockedEitherWay(viewerId, targetUserId),
    ]);

    if (!target || !areFriends || isBlocked) {
      throw new NotFoundException('User not found');
    }

    return this.reviewsByUser(targetUserId, cursor, { visibility: 'friends' });
  }

  private async reviewsByUser(
    userId: string,
    cursor?: string,
    whereInput: Prisma.ReviewWhereInput = {},
  ) {
    const parsedCursor = decodeCursor(cursor);
    const reviews = await this.prisma.review.findMany({
      where: {
        ...whereInput,
        userId,
        deletedAt: null,
        OR: parsedCursor
          ? [
              { createdAt: { lt: parsedCursor.createdAt } },
              { createdAt: parsedCursor.createdAt, id: { lt: parsedCursor.id } },
            ]
          : undefined,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        movie: true,
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    });

    const page = reviews.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map((review) => this.presentFeedItem(review)),
      nextCursor: reviews.length > PAGE_SIZE && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  private presentFeedItem(
    review: Prisma.ReviewGetPayload<{
      include: {
        user: { select: { id: true; username: true; displayName: true; avatarUrl: true } };
        movie: true;
        comments: {
          select: {
            user: { select: { id: true; username: true; displayName: true; avatarUrl: true } };
          };
        };
        _count: { select: { comments: true } };
      };
    }>,
  ) {
    const participantIds = new Set<string>();
    const commentParticipants = review.comments
      .map((comment) => comment.user)
      .filter((user) => {
        if (participantIds.has(user.id)) {
          return false;
        }
        participantIds.add(user.id);
        return true;
      })
      .slice(0, 3);

    return {
      reviewId: review.id,
      createdAt: review.createdAt.toISOString(),
      rating: Number(review.rating),
      quickTake: review.quickTake,
      tags: review.tags,
      containsSpoilers: review.containsSpoilers,
      commentCount: review._count.comments,
      commentParticipants,
      author: review.user,
      movie: movieSummary(review.movie),
    };
  }
}
