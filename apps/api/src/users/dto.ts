import { IsString, Length } from 'class-validator';

export class UserSearchQueryDto {
  @IsString()
  @Length(2, 32)
  q: string;
}

export class UserIdParamDto {
  @IsString()
  id: string;
}
