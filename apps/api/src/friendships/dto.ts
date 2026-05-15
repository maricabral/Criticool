import { IsString } from 'class-validator';

export class CreateFriendRequestDto {
  @IsString()
  addresseeId: string;
}

export class FriendRequestParamDto {
  @IsString()
  id: string;
}
