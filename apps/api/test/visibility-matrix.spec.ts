import { describe, expect, it } from 'vitest';
import { canSeeReviewDirect } from '../src/visibility/visibility.service';

describe('review visibility matrix', () => {
  const baseArgs = (overrides: Record<string, unknown> = {}) => ({
    viewerId: 'viewer',
    authorId: 'author',
    visibility: 'friends' as const,
    deletedAt: null as Date | null,
    areFriends: false,
    isBlocked: false,
    ...overrides,
  });

  describe('self', () => {
    it('author can see their own friends-only review', () => {
      expect(canSeeReviewDirect(baseArgs({ viewerId: 'author', authorId: 'author' }))).toBe(true);
    });

    it('author can see their own private review', () => {
      expect(
        canSeeReviewDirect(baseArgs({ viewerId: 'author', authorId: 'author', visibility: 'private' })),
      ).toBe(true);
    });
  });

  describe('friend', () => {
    it('friend can see friends-only review', () => {
      expect(canSeeReviewDirect(baseArgs({ areFriends: true }))).toBe(true);
    });

    it('friend cannot see private review', () => {
      expect(canSeeReviewDirect(baseArgs({ areFriends: true, visibility: 'private' }))).toBe(false);
    });
  });

  describe('stranger', () => {
    it('stranger cannot see friends-only review', () => {
      expect(canSeeReviewDirect(baseArgs())).toBe(false);
    });

    it('stranger cannot see private review', () => {
      expect(canSeeReviewDirect(baseArgs({ visibility: 'private' }))).toBe(false);
    });
  });

  describe('blocked user', () => {
    it('blocked friend cannot see review', () => {
      expect(canSeeReviewDirect(baseArgs({ areFriends: true, isBlocked: true }))).toBe(false);
    });

    it('blocked stranger cannot see review', () => {
      expect(canSeeReviewDirect(baseArgs({ isBlocked: true }))).toBe(false);
    });

    it('author blocked by viewer still hidden', () => {
      expect(canSeeReviewDirect(baseArgs({ areFriends: true, isBlocked: true }))).toBe(false);
    });
  });

  describe('deleted review', () => {
    it('deleted review hidden from friends', () => {
      expect(canSeeReviewDirect(baseArgs({ areFriends: true, deletedAt: new Date() }))).toBe(false);
    });

    it('deleted review hidden from author', () => {
      expect(
        canSeeReviewDirect(
          baseArgs({ viewerId: 'author', authorId: 'author', deletedAt: new Date() }),
        ),
      ).toBe(false);
    });

    it('deleted review hidden from strangers', () => {
      expect(canSeeReviewDirect(baseArgs({ deletedAt: new Date() }))).toBe(false);
    });
  });
});
