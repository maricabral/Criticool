import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewVisibility } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';
import { TranslateTargetDto } from './dto';
import { TranslationAdapter, TranslationFields } from './translation-adapter';

type TranslationTarget = {
  targetType: 'review' | 'comment';
  targetId: string;
  targetVersion: string;
  sourceLocale: string | null;
  fields: TranslationFields;
};

@Injectable()
export class TranslationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly adapter: TranslationAdapter,
  ) {}

  async translate(viewerId: string, dto: TranslateTargetDto) {
    const target =
      dto.targetType === 'review'
        ? await this.reviewTarget(viewerId, dto.targetId, dto.sourceLocale)
        : await this.commentTarget(viewerId, dto.targetId, dto.sourceLocale);
    const targetLocale = this.normalizeLocale(dto.targetLocale);
    const sourceLocale = this.normalizeSourceLocale(target.sourceLocale);

    const cached = await this.prisma.translationCache.findUnique({
      where: {
        targetType_targetId_targetVersion_sourceLocale_targetLocale: {
          targetType: target.targetType,
          targetId: target.targetId,
          targetVersion: target.targetVersion,
          sourceLocale,
          targetLocale,
        },
      },
    });

    if (cached) {
      return this.present(target, targetLocale, sourceLocale, true, cached.fields);
    }

    const translatedFields = await this.adapter.translate({
      fields: target.fields,
      sourceLocale: sourceLocale === 'und' ? null : sourceLocale,
      targetLocale,
    });

    await this.prisma.translationCache.create({
      data: {
        targetType: target.targetType,
        targetId: target.targetId,
        targetVersion: target.targetVersion,
        sourceLocale,
        targetLocale,
        fields: translatedFields as Prisma.InputJsonValue,
        provider: this.adapter.providerName,
      },
    });

    return this.present(target, targetLocale, sourceLocale, false, translatedFields);
  }

  private async reviewTarget(
    viewerId: string,
    reviewId: string,
    sourceLocale?: string,
  ): Promise<TranslationTarget> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        visibility: true,
        deletedAt: true,
        updatedAt: true,
        quickTake: true,
        body: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.ensureCanSeeReview(viewerId, review);

    return {
      targetType: 'review',
      targetId: review.id,
      targetVersion: review.updatedAt.toISOString(),
      sourceLocale: sourceLocale ?? null,
      fields: {
        quickTake: review.quickTake,
        body: review.body,
      },
    };
  }

  private async commentTarget(
    viewerId: string,
    commentId: string,
    sourceLocale?: string,
  ): Promise<TranslationTarget> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        body: true,
        updatedAt: true,
        deletedAt: true,
        review: {
          select: {
            userId: true,
            visibility: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    await this.ensureCanSeeReview(viewerId, comment.review);
    if (await this.visibility.isBlockedEitherWay(viewerId, comment.userId)) {
      throw new NotFoundException('Comment not found');
    }

    return {
      targetType: 'comment',
      targetId: comment.id,
      targetVersion: comment.updatedAt.toISOString(),
      sourceLocale: sourceLocale ?? null,
      fields: {
        body: comment.body,
      },
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

  private present(
    target: TranslationTarget,
    targetLocale: string,
    sourceLocale: string,
    cached: boolean,
    fields: Prisma.JsonValue | TranslationFields,
  ) {
    return {
      targetType: target.targetType,
      targetId: target.targetId,
      sourceLocale: sourceLocale === 'und' ? null : sourceLocale,
      targetLocale,
      targetVersion: target.targetVersion,
      cached,
      fields: this.normalizeFields(fields),
    };
  }

  private normalizeFields(fields: Prisma.JsonValue | TranslationFields): TranslationFields {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return {};
    }
    const row = fields as Record<string, unknown>;
    return {
      quickTake: typeof row.quickTake === 'string' ? row.quickTake : null,
      body: typeof row.body === 'string' ? row.body : null,
    };
  }

  private normalizeSourceLocale(locale?: string | null) {
    return locale ? this.normalizeLocale(locale) : 'und';
  }

  private normalizeLocale(locale: string) {
    return locale.trim().replace('_', '-').toLowerCase();
  }
}
