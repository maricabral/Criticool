import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateReviewDto, UpdateReviewDto } from '../src/reviews/dto';

describe('review DTO rating validation', () => {
  it('accepts half-popcorn review ratings', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      movieId: 'movie-1',
      rating: 4.5,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('accepts half-popcorn updates', async () => {
    const dto = plainToInstance(UpdateReviewDto, {
      rating: 3.5,
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects ratings outside half-popcorn steps', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      movieId: 'movie-1',
      rating: 4.7,
    });

    const errors = await validate(dto);
    expect(errors.find((error) => error.property === 'rating')?.constraints).toHaveProperty('isIn');
  });
});
