import { describe, expect, it } from 'vitest';
import { canSeeReviewDirect } from '../src/visibility/visibility.service';

describe('review visibility', () => {
  const base = {
    viewerId: 'viewer',
    authorId: 'author',
    visibility: 'friends' as const,
    deletedAt: null,
  };

  it('allows the author to see their own review', () => {
    expect(
      canSeeReviewDirect({
        ...base,
        viewerId: 'author',
        authorId: 'author',
        areFriends: false,
        isBlocked: false,
      }),
    ).toBe(true);
  });

  it('allows accepted friends to see friends-only reviews', () => {
    expect(canSeeReviewDirect({ ...base, areFriends: true, isBlocked: false })).toBe(true);
  });

  it('blocks strangers from friends-only reviews', () => {
    expect(canSeeReviewDirect({ ...base, areFriends: false, isBlocked: false })).toBe(false);
  });

  it('blocks either side of a block relationship', () => {
    expect(canSeeReviewDirect({ ...base, areFriends: true, isBlocked: true })).toBe(false);
  });

  it('hides deleted reviews', () => {
    expect(
      canSeeReviewDirect({ ...base, areFriends: true, isBlocked: false, deletedAt: new Date() }),
    ).toBe(false);
  });
});
