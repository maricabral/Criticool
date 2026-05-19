import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class TranslateTargetDto {
  @IsIn(['review', 'comment'])
  targetType: 'review' | 'comment';

  @IsString()
  targetId: string;

  @IsString()
  @Length(2, 16)
  targetLocale: string;

  @IsOptional()
  @IsString()
  @Length(2, 16)
  sourceLocale?: string;
}
