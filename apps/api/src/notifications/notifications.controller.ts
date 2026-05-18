import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { NotificationIdParamDto } from './dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.notifications.list(user.id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: RequestUser, @Param() params: NotificationIdParamDto) {
    return this.notifications.markRead(user.id, params.id);
  }
}
