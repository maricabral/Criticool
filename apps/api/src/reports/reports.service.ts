import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { VisibilityService } from '../visibility/visibility.service';
import { CreateReportDto } from './dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const targetType = dto.targetType as ReportTargetType;
    await this.ensureTargetCanBeReported(reporterId, targetType, dto.targetId);

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId: dto.targetId,
        reason: dto.reason.trim(),
        details: dto.details?.trim() || null,
      },
    });

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      createdAt: report.createdAt.toISOString(),
    };
  }

  private async ensureTargetCanBeReported(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
  ) {
    if (targetType === 'user') {
      if (reporterId === targetId) {
        throw new BadRequestException('You cannot report yourself');
      }
      const user = await this.prisma.user.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('Report target not found');
      }
      return;
    }

    if (targetType === 'review') {
      const review = await this.prisma.review.findUnique({
        where: { id: targetId },
        select: { userId: true, visibility: true, deletedAt: true },
      });
      if (!review) {
        throw new NotFoundException('Report target not found');
      }
      const canSee = await this.visibility.canSeeReview({
        viewerId: reporterId,
        authorId: review.userId,
        visibility: review.visibility,
        deletedAt: review.deletedAt,
      });
      if (!canSee) {
        throw new NotFoundException('Report target not found');
      }
      return;
    }

    const comment = await this.prisma.comment.findFirst({
      where: { id: targetId, deletedAt: null },
      include: {
        review: { select: { userId: true, visibility: true, deletedAt: true } },
      },
    });
    if (!comment) {
      throw new NotFoundException('Report target not found');
    }
    const canSee = await this.visibility.canSeeReview({
      viewerId: reporterId,
      authorId: comment.review.userId,
      visibility: comment.review.visibility,
      deletedAt: comment.review.deletedAt,
    });
    if (!canSee) {
      throw new NotFoundException('Report target not found');
    }
  }
}
