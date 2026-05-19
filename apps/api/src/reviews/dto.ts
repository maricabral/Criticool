import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsBoolean,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

const REVIEW_RATING_VALUES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export class ReviewIdParamDto {
  @IsString()
  id: string;
}

export class CommentIdParamDto extends ReviewIdParamDto {
  @IsString()
  commentId: string;
}

export class ReviewCommentsQueryDto {
  @IsOptional()
  @IsIn(['best', 'new'])
  commentSort?: 'best' | 'new';
}

export class CreateReviewDto {
  @IsString()
  movieId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsIn(REVIEW_RATING_VALUES, { message: 'rating must be in 0.5 increments between 0 and 5' })
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @Length(0, 180)
  quickTake?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 32, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  containsSpoilers?: boolean;

  @IsOptional()
  @IsIn(['private', 'friends'])
  visibility?: 'private' | 'friends';
}

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsIn(REVIEW_RATING_VALUES, { message: 'rating must be in 0.5 increments between 0 and 5' })
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @Length(0, 180)
  quickTake?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 32, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  containsSpoilers?: boolean;

  @IsOptional()
  @IsIn(['private', 'friends'])
  visibility?: 'private' | 'friends';
}

export class CreateCommentDto {
  @IsString()
  @Length(1, 2000)
  body: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @IsString()
  @Length(1, 2000)
  body: string;
}

export class VoteCommentDto {
  @IsIn([-1, 1])
  value: -1 | 1;
}
