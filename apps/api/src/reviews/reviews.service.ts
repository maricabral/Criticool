import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewVisibility } from '@prisma/client';
import { movieSummary } from '../common/movie-presenter';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';
import { CreateCommentDto, CreateReviewDto, UpdateReviewDto } from './dto';

type PresentedComment = {
  id: string;
  reviewId: string;
  parentCommentId: string | null;
  body: string;
  depth: number;
  score: number;
  viewerVote: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replies: PresentedComment[];
};

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications?: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          movieId: dto.movieId,
          rating: dto.rating,
          quickTake: this.cleanText(dto.quickTake, 180),
          body: this.cleanText(dto.body, 10000),
          tags: this.cleanTags(dto.tags),
          containsSpoilers: dto.containsSpoilers ?? false,
          visibility: dto.visibility ?? 'friends',
        },
        include: this.reviewInclude(userId),
      });
      return this.presentReview(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already reviewed this movie');
      }
      throw error;
    }
  }

  async get(viewerId: string, reviewId: string, commentSort: 'best' | 'new' = 'best') {
    const review = await this.findReviewOrThrow(reviewId, viewerId, commentSort);
    const canSee = await this.visibility.canSeeReview({
      viewerId,
      authorId: review.userId,
      visibility: review.visibility,
      deletedAt: review.deletedAt,
    });
    if (!canSee) {
      throw new NotFoundException('Review not found');
    }
    return this.presentReview(review, await this.blockedUserIds(viewerId));
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.findReviewOrThrow(reviewId);
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }
    if (review.deletedAt) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reviewRevision.create({
        data: {
          reviewId: review.id,
          rating: review.rating,
          quickTake: review.quickTake,
          body: review.body,
          tags: review.tags,
          containsSpoilers: review.containsSpoilers,
        },
      });
      return tx.review.update({
        where: { id: review.id },
        data: {
          rating: dto.rating ?? undefined,
          quickTake: dto.quickTake === undefined ? undefined : this.cleanText(dto.quickTake, 180),
          body: dto.body === undefined ? undefined : this.cleanText(dto.body, 10000),
          tags: dto.tags === undefined ? undefined : this.cleanTags(dto.tags),
          containsSpoilers: dto.containsSpoilers ?? undefined,
          visibility: dto.visibility ?? undefined,
        },
        include: this.reviewInclude(userId),
      });
    });

    return this.presentReview(updated);
  }

  async softDelete(userId: string, reviewId: string) {
    const review = await this.findReviewOrThrow(reviewId);
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    await this.prisma.review.update({ where: { id: review.id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async createComment(userId: string, reviewId: string, dto: CreateCommentDto) {
    const review = await this.findReviewOrThrow(reviewId, userId);
    await this.ensureCanSeeReview(userId, review);

    const parent = dto.parentCommentId
      ? await this.prisma.comment.findFirst({
          where: {
            id: dto.parentCommentId,
            reviewId,
            deletedAt: null,
          },
          select: { id: true, depth: true, userId: true },
        })
      : null;

    if (dto.parentCommentId && !parent) {
      throw new NotFoundException('Parent comment not found');
    }
    if (parent && parent.depth >= 3) {
      throw new BadRequestException('Comment thread is already at the reply limit');
    }

    const comment = await this.prisma.comment.create({
      data: {
        reviewId,
        userId,
        parentCommentId: parent?.id,
        depth: parent ? parent.depth + 1 : 0,
        body: this.cleanText(dto.body, 2000) ?? '',
      },
      include: this.commentInclude(userId),
    });

    const notifiedUserIds = new Set<string>();
    if (parent && parent.userId !== userId) {
      await this.notifications?.create({
        recipientId: parent.userId,
        actorId: userId,
        type: 'comment_replied',
        reviewId,
        commentId: comment.id,
      });
      notifiedUserIds.add(parent.userId);
    }
    if (review.userId !== userId && !notifiedUserIds.has(review.userId)) {
      await this.notifications?.create({
        recipientId: review.userId,
        actorId: userId,
        type: 'review_commented',
        reviewId,
        commentId: comment.id,
      });
    }

    return this.presentComment(comment);
  }

  async voteComment(userId: string, reviewId: string, commentId: string, value: -1 | 1) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, reviewId, deletedAt: null },
      include: {
        review: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.ensureCanSeeReview(userId, comment.review);

    let changed = false;
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (existing?.value === value) {
        const unchanged = await tx.comment.findUnique({
          where: { id: commentId },
          include: this.commentInclude(userId),
        });

        if (!unchanged) {
          throw new NotFoundException('Comment not found');
        }

        return unchanged;
      }

      if (existing) {
        await tx.commentVote.delete({
          where: { commentId_userId: { commentId, userId } },
        });
        changed = true;

        return tx.comment.update({
          where: { id: commentId },
          data: { score: { increment: -existing.value } },
          include: this.commentInclude(userId),
        });
      }

      await tx.commentVote.upsert({
        where: { commentId_userId: { commentId, userId } },
        create: { commentId, userId, value },
        update: { value },
      });
      changed = true;

      return tx.comment.update({
        where: { id: commentId },
        data: { score: { increment: value } },
        include: this.commentInclude(userId),
      });
    });

    if (changed && comment.userId !== userId) {
      await this.notifications?.create({
        recipientId: comment.userId,
        actorId: userId,
        type: 'comment_voted',
        reviewId,
        commentId,
      });
    }

    return this.presentComment(updated);
  }

  async removeCommentVote(userId: string, reviewId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, reviewId, deletedAt: null },
      include: {
        review: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.ensureCanSeeReview(userId, comment.review);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.commentVote.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (!existing) {
        const unchanged = await tx.comment.findUnique({
          where: { id: commentId },
          include: this.commentInclude(userId),
        });

        if (!unchanged) {
          throw new NotFoundException('Comment not found');
        }

        return unchanged;
      }

      await tx.commentVote.delete({
        where: { commentId_userId: { commentId, userId } },
      });

      return tx.comment.update({
        where: { id: commentId },
        data: { score: { increment: -existing.value } },
        include: this.commentInclude(userId),
      });
    });

    return this.presentComment(updated);
  }

  async updateComment(userId: string, reviewId: string, commentId: string, body: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, reviewId, deletedAt: null },
      include: { review: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    await this.ensureCanSeeReview(userId, comment.review);

    const cleaned = this.cleanText(body, 2000);
    if (!cleaned) {
      throw new BadRequestException('Comment body is required');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: cleaned },
      include: this.commentInclude(userId),
    });

    return this.presentComment(updated);
  }

  async deleteComment(userId: string, reviewId: string, commentId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, reviewId, deletedAt: null },
      include: { review: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.ensureCanSeeReview(userId, comment.review);

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), body: '' },
    });

    return { ok: true };
  }

  private async findReviewOrThrow(
    id: string,
    viewerId?: string,
    commentSort: 'best' | 'new' = 'best',
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: this.reviewInclude(viewerId, commentSort),
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  private reviewInclude(viewerId?: string, commentSort: 'best' | 'new' = 'best') {
    return {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      movie: true,
      comments: {
        orderBy:
          commentSort === 'new'
            ? [{ createdAt: 'desc' }]
            : [{ score: 'desc' }, { createdAt: 'asc' }],
        include: this.commentInclude(viewerId),
      },
      _count: { select: { comments: { where: { deletedAt: null } } } },
    } satisfies Prisma.ReviewInclude;
  }

  private commentInclude(viewerId?: string) {
    return {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      votes: viewerId
        ? { where: { userId: viewerId }, select: { value: true } }
        : { select: { value: true } },
    } satisfies Prisma.CommentInclude;
  }

  private presentReview(
    review: Prisma.ReviewGetPayload<{
      include: ReturnType<ReviewsService['reviewInclude']>;
    }>,
    hiddenUserIds: Set<string> = new Set(),
  ) {
    const comments = review.comments.filter((comment) => !hiddenUserIds.has(comment.userId));
    const commentCount = comments.filter((comment) => !comment.deletedAt).length;
    return {
      id: review.id,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      rating: Number(review.rating),
      quickTake: review.quickTake,
      body: review.body,
      tags: review.tags,
      containsSpoilers: review.containsSpoilers,
      visibility: review.visibility,
      commentCount,
      author: review.user,
      movie: movieSummary(review.movie),
      comments: this.presentCommentTree(comments),
    };
  }

  private presentCommentTree(
    comments: Array<
      Prisma.CommentGetPayload<{
        include: ReturnType<ReviewsService['commentInclude']>;
      }>
    >,
  ) {
    const byId = new Map<string, PresentedComment>();
    const roots: PresentedComment[] = [];

    for (const comment of comments) {
      byId.set(comment.id, this.presentComment(comment));
    }

    for (const comment of comments) {
      const presented = byId.get(comment.id);
      if (!presented) {
        continue;
      }
      if (comment.parentCommentId) {
        const parent = byId.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(presented);
          continue;
        }
      }
      roots.push(presented);
    }

    return roots
      .map((comment) => this.pruneDeletedCommentLeaf(comment))
      .filter((comment): comment is PresentedComment => Boolean(comment));
  }

  private pruneDeletedCommentLeaf(comment: PresentedComment): PresentedComment | null {
    comment.replies = comment.replies
      .map((reply) => this.pruneDeletedCommentLeaf(reply))
      .filter((reply): reply is PresentedComment => Boolean(reply));

    if (comment.deletedAt && !comment.replies.length) {
      return null;
    }

    return comment;
  }

  private presentComment(
    comment: Prisma.CommentGetPayload<{
      include: ReturnType<ReviewsService['commentInclude']>;
    }>,
  ): PresentedComment {
    return {
      id: comment.id,
      reviewId: comment.reviewId,
      parentCommentId: comment.parentCommentId,
      body: comment.deletedAt ? 'Deleted comment' : comment.body,
      depth: comment.depth,
      score: comment.score,
      viewerVote: comment.votes[0]?.value ?? 0,
      deletedAt: comment.deletedAt?.toISOString() ?? null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.deletedAt
        ? {
            id: 'deleted',
            username: 'deleted',
            displayName: 'Deleted user',
            avatarUrl: null,
          }
        : comment.user,
      replies: [],
    };
  }

  private async ensureCanSeeReview(
    viewerId: string,
    review: {
      userId: string;
      visibility: ReviewVisibility;
      deletedAt: Date | null;
    },
  ) {
    const canSee = await this.visibility.canSeeReview({
      viewerId,
      authorId: review.userId,
      visibility: review.visibility,
      deletedAt: review.deletedAt,
    });
    if (!canSee) {
      throw new NotFoundException('Review not found');
    }
  }

  private async blockedUserIds(userId: string) {
    const rows = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    return new Set(
      rows.map((row) => (row.blockerId === userId ? row.blockedId : row.blockerId)),
    );
  }

  private cleanText(value?: string | null, maxLength?: number) {
    const cleaned = value?.trim().replace(/\s+/g, ' ');
    if (maxLength && cleaned && cleaned.length > maxLength) {
      return cleaned.slice(0, maxLength);
    }
    return cleaned ? cleaned : null;
  }

  private cleanTags(tags?: string[] | null) {
    if (!tags?.length) {
      return [];
    }
    const seen = new Set<string>();
    return tags
      .map((tag) => tag.trim().replace(/\s+/g, ' ').toLowerCase())
      .filter((tag) => {
        if (!tag || seen.has(tag)) {
          return false;
        }
        seen.add(tag);
        return true;
      })
      .slice(0, 5);
  }
}
