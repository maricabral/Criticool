import { Injectable } from '@nestjs/common';
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
        _count: { select: { comments: true } },
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
        _count: { select: { comments: true } };
      };
    }>,
  ) {
    return {
      reviewId: review.id,
      createdAt: review.createdAt.toISOString(),
      rating: Number(review.rating),
      quickTake: review.quickTake,
      tags: review.tags,
      containsSpoilers: review.containsSpoilers,
      commentCount: review._count.comments,
      author: review.user,
      movie: movieSummary(review.movie),
    };
  }
}
