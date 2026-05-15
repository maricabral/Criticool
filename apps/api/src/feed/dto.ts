import { IsOptional, IsString } from 'class-validator';

export class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}
