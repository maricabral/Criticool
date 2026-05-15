import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { movieSummary } from '../common/movie-presenter';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
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
          quickTake: this.cleanText(dto.quickTake),
          body: this.cleanText(dto.body),
          tags: this.cleanTags(dto.tags),
          containsSpoilers: dto.containsSpoilers ?? false,
          visibility: dto.visibility ?? 'friends',
        },
        include: this.reviewInclude(),
      });
      return this.presentReview(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already reviewed this movie');
      }
      throw error;
    }
  }

  async get(viewerId: string, reviewId: string) {
    const review = await this.findReviewOrThrow(reviewId);
    const canSee = await this.visibility.canSeeReview({
      viewerId,
      authorId: review.userId,
      visibility: review.visibility,
      deletedAt: review.deletedAt,
    });
    if (!canSee) {
      throw new NotFoundException('Review not found');
    }
    return this.presentReview(review);
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
          quickTake: dto.quickTake === undefined ? undefined : this.cleanText(dto.quickTake),
          body: dto.body === undefined ? undefined : this.cleanText(dto.body),
          tags: dto.tags === undefined ? undefined : this.cleanTags(dto.tags),
          containsSpoilers: dto.containsSpoilers ?? undefined,
          visibility: dto.visibility ?? undefined,
        },
        include: this.reviewInclude(),
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

  private async findReviewOrThrow(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id }, include: this.reviewInclude() });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  private reviewInclude() {
    return {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      movie: true,
      _count: { select: { comments: true } },
    } satisfies Prisma.ReviewInclude;
  }

  private presentReview(
    review: Prisma.ReviewGetPayload<{
      include: ReturnType<ReviewsService['reviewInclude']>;
    }>,
  ) {
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
      commentCount: review._count.comments,
      author: review.user,
      movie: movieSummary(review.movie),
    };
  }

  private cleanText(value?: string | null) {
    const cleaned = value?.trim();
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
