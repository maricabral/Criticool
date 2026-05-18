import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { FeedController } from '../src/feed/feed.controller';

describe('FeedController', () => {
  it('maps the personal reviews endpoint to GET /feed/me', () => {
    const handler = Object.getOwnPropertyDescriptor(FeedController.prototype, 'myReviews')?.value;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
  });

  it('maps the user reviews endpoint to GET /feed/users/:id', () => {
    const handler = Object.getOwnPropertyDescriptor(FeedController.prototype, 'userReviews')?.value;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('users/:id');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
  });

  it('loads reviews for the authenticated user', async () => {
    const service = {
      userReviews: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    };
    const controller = new FeedController(service as never);

    await expect(
      controller.myReviews(
        { id: 'user-id', email: 'me@example.com', username: 'me' },
        { cursor: 'cursor' },
      ),
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(service.userReviews).toHaveBeenCalledWith('user-id', 'cursor');
  });

  it('loads visible reviews for another user', async () => {
    const service = {
      userReviewsForViewer: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    };
    const controller = new FeedController(service as never);

    await expect(
      controller.userReviews(
        { id: 'viewer-id', email: 'me@example.com', username: 'me' },
        { id: 'friend-id' },
        { cursor: 'cursor' },
      ),
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(service.userReviewsForViewer).toHaveBeenCalledWith(
      'viewer-id',
      'friend-id',
      'cursor',
    );
  });
});
