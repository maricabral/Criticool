import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateReportDto {
  @IsIn(['user', 'review', 'comment'])
  targetType: 'user' | 'review' | 'comment';

  @IsString()
  targetId: string;

  @IsString()
  @Length(3, 80)
  reason: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  details?: string;
}
