import { describe, expect, it } from 'vitest';
import {
  closeReviewNavigation,
  openReviewNavigation,
  resolveActiveTab,
  type AppNavigationState,
} from '../src/navigationState';

const friend = { id: 'friend-1' };

describe('mobile navigation source tabs', () => {
  it('keeps Friends active from friend profile into review detail and back', () => {
    const friendProfile: AppNavigationState<typeof friend> = {
      tab: 'profile',
      selectedProfileUser: friend,
      profileBackTab: 'friends',
      selectedReviewId: null,
      reviewBackTab: null,
    };

    const reviewDetail = openReviewNavigation(friendProfile, 'review-1');

    expect(reviewDetail.selectedProfileUser).toBe(friend);
    expect(reviewDetail.profileBackTab).toBe('friends');
    expect(resolveActiveTab(reviewDetail)).toBe('friends');

    const backToFriendProfile = closeReviewNavigation(reviewDetail);

    expect(backToFriendProfile.selectedReviewId).toBeNull();
    expect(backToFriendProfile.selectedProfileUser).toBe(friend);
    expect(resolveActiveTab(backToFriendProfile)).toBe('friends');
  });

  it('keeps Me active for own profile review detail', () => {
    const ownProfile: AppNavigationState = {
      tab: 'profile',
      selectedProfileUser: null,
      profileBackTab: null,
      selectedReviewId: null,
      reviewBackTab: null,
    };

    const reviewDetail = openReviewNavigation(ownProfile, 'review-1');

    expect(resolveActiveTab(reviewDetail)).toBe('profile');
    expect(closeReviewNavigation(reviewDetail).tab).toBe('profile');
  });

  it('keeps Feed active for review detail opened from Feed', () => {
    const feed: AppNavigationState = {
      tab: 'feed',
      selectedProfileUser: null,
      profileBackTab: null,
      selectedReviewId: null,
      reviewBackTab: null,
    };

    const reviewDetail = openReviewNavigation(feed, 'review-1');

    expect(resolveActiveTab(reviewDetail)).toBe('feed');
    expect(closeReviewNavigation(reviewDetail).tab).toBe('feed');
  });
});
