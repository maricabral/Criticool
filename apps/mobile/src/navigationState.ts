export type Tab = 'feed' | 'search' | 'create' | 'friends' | 'profile';

export type AppNavigationState<TProfileUser = unknown> = {
  tab: Tab;
  selectedProfileUser: TProfileUser | null;
  profileBackTab: Tab | null;
  selectedReviewId: string | null;
  reviewBackTab: Tab | null;
};

export function resolveActiveTab(state: AppNavigationState): Tab {
  if (state.selectedReviewId && state.reviewBackTab) {
    return state.reviewBackTab;
  }

  if (state.selectedProfileUser && state.profileBackTab) {
    return state.profileBackTab;
  }

  return state.tab;
}

export function openReviewNavigation<TProfileUser>(
  state: AppNavigationState<TProfileUser>,
  reviewId: string,
  sourceTab = resolveActiveTab(state),
): AppNavigationState<TProfileUser> {
  const keepProfileContext = Boolean(state.selectedProfileUser && state.profileBackTab);

  return {
    ...state,
    tab: 'profile',
    selectedProfileUser: keepProfileContext ? state.selectedProfileUser : null,
    profileBackTab: keepProfileContext ? state.profileBackTab : null,
    selectedReviewId: reviewId,
    reviewBackTab: sourceTab,
  };
}

export function closeReviewNavigation<TProfileUser>(
  state: AppNavigationState<TProfileUser>,
): AppNavigationState<TProfileUser> {
  const nextTab = state.selectedProfileUser
    ? 'profile'
    : state.reviewBackTab && state.reviewBackTab !== 'profile'
      ? state.reviewBackTab
      : 'profile';

  return {
    ...state,
    tab: nextTab,
    selectedReviewId: null,
    reviewBackTab: null,
  };
}
