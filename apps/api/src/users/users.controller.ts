import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { UserIdParamDto, UserSearchQueryDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('search')
  search(@CurrentUser() user: RequestUser, @Query() query: UserSearchQueryDto) {
    return this.users.search(user.id, query.q);
  }

  @Get('blocked')
  blocked(@CurrentUser() user: RequestUser) {
    return this.users.blocked(user.id);
  }

  @Post(':id/block')
  block(@CurrentUser() user: RequestUser, @Param() params: UserIdParamDto) {
    return this.users.block(user.id, params.id);
  }

  @Delete(':id/block')
  unblock(@CurrentUser() user: RequestUser, @Param() params: UserIdParamDto) {
    return this.users.unblock(user.id, params.id);
  }
}
