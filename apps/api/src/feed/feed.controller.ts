import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { FeedQueryDto } from './dto';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(AuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  feed(@CurrentUser() user: RequestUser, @Query() query: FeedQueryDto) {
    return this.feedService.feed(user.id, query.cursor);
  }

  @Get('me')
  myReviews(@CurrentUser() user: RequestUser, @Query() query: FeedQueryDto) {
    return this.feedService.userReviews(user.id, user.id, query.cursor);
  }

  @Get('users/:id')
  userReviews(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query() query: FeedQueryDto,
  ) {
    return this.feedService.userReviews(user.id, id, query.cursor);
  }
}
