import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type CreateNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  reviewId?: string | null;
  commentId?: string | null;
  friendshipId?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    if (input.actorId && input.actorId === input.recipientId) {
      return null;
    }

    try {
      return await this.prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId ?? null,
          type: input.type,
          reviewId: input.reviewId ?? null,
          commentId: input.commentId ?? null,
          friendshipId: input.friendshipId ?? null,
        },
      });
    } catch {
      return null;
    }
  }

  async list(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      include: this.notificationInclude(),
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      items: notifications.map((notification) => this.present(notification)),
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId: userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
      include: this.notificationInclude(),
    });

    return this.present(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true, count: result.count };
  }

  private notificationInclude() {
    return {
      actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    } satisfies Prisma.NotificationInclude;
  }

  private present(
    notification: Prisma.NotificationGetPayload<{
      include: ReturnType<NotificationsService['notificationInclude']>;
    }>,
  ) {
    return {
      id: notification.id,
      type: notification.type,
      reviewId: notification.reviewId,
      commentId: notification.commentId,
      friendshipId: notification.friendshipId,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actor,
    };
  }
}
