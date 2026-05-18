import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateFriendRequestDto, FriendRequestParamDto } from './dto';
import { FriendshipsService } from './friendships.service';

@Controller()
@UseGuards(AuthGuard)
export class FriendshipsController {
  constructor(private readonly friendships: FriendshipsService) {}

  @Post('friend-requests')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFriendRequestDto) {
    return this.friendships.createRequest(user.id, dto.addresseeId);
  }

  @Get('friend-requests/incoming')
  incoming(@CurrentUser() user: RequestUser) {
    return this.friendships.incoming(user.id);
  }

  @Get('friend-requests/outgoing')
  outgoing(@CurrentUser() user: RequestUser) {
    return this.friendships.outgoing(user.id);
  }

  @Post('friend-requests/:id/accept')
  accept(@CurrentUser() user: RequestUser, @Param() params: FriendRequestParamDto) {
    return this.friendships.accept(user.id, params.id);
  }

  @Post('friend-requests/:id/decline')
  decline(@CurrentUser() user: RequestUser, @Param() params: FriendRequestParamDto) {
    return this.friendships.decline(user.id, params.id);
  }

  @Delete('friend-requests/:id')
  cancel(@CurrentUser() user: RequestUser, @Param() params: FriendRequestParamDto) {
    return this.friendships.cancel(user.id, params.id);
  }

  @Get('friends')
  friends(@CurrentUser() user: RequestUser) {
    return this.friendships.friends(user.id);
  }
}
