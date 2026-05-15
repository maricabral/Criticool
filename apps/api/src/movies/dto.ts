import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MovieSearchQueryDto {
  @IsString()
  q: string;
}

export class TmdbIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tmdbId: number;
}

export class MovieIdParamDto {
  @IsString()
  id: string;
}

export class ImportMovieDto {
  @IsOptional()
  @IsString()
  title?: string;
}
