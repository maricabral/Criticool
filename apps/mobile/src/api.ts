import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  FeedResponse,
  MovieSummary,
  NotificationsResponse,
  NotificationItem,
  ReviewComment,
  ReviewDetail,
  TranslationResponse,
  TranslationTargetType,
} from '@criticool/shared';

export type {
  NotificationItem,
  ReviewComment,
  ReviewDetail,
  TranslationResponse,
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKENS_KEY = 'criticool.tokens';

export type FriendRequest = {
  id: string;
  status: string;
  requester: { id: string; username: string; displayName: string; avatarUrl: string | null };
  addressee: { id: string; username: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
  respondedAt: string | null;
};

export type FriendSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export async function loadTokens() {
  const value = await AsyncStorage.getItem(TOKENS_KEY);
  return value ? (JSON.parse(value) as AuthTokens) : null;
}

export async function saveTokens(tokens: AuthTokens | null) {
  if (!tokens) {
    await AsyncStorage.removeItem(TOKENS_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

let onSessionExpired: (() => void) | null = null;
let onTokensChanged: ((tokens: AuthTokens) => void) | null = null;

export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function setOnTokensChanged(handler: ((tokens: AuthTokens) => void) | null) {
  onTokensChanged = handler;
}

let refreshPromise: Promise<AuthTokens | null> | null = null;

async function refreshAccessToken(tokens: AuthTokens): Promise<AuthTokens | null> {
  try {
    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    const data = await response.json();
    if (!response.ok) return null;
    const newTokens: AuthTokens = {
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
    await saveTokens(newTokens);
    onTokensChanged?.(newTokens);
    return newTokens;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { tokens?: AuthTokens | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${options.tokens.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (response.status === 401 && options.tokens?.refreshToken) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken(options.tokens).finally(() => {
        refreshPromise = null;
      });
    }
    const newTokens = await refreshPromise;
    if (newTokens) {
      // Retry the original request with new access token
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Accept', 'application/json');
      if (options.body && !retryHeaders.has('Content-Type')) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      retryHeaders.set('Authorization', `Bearer ${newTokens.accessToken}`);
      const retryResponse = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
      const retryText = await retryResponse.text();
      const retryData = retryText ? JSON.parse(retryText) : null;
      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          onSessionExpired?.();
        }
        throw new Error(retryData?.message ?? `Request failed with ${retryResponse.status}`);
      }
      return retryData as T;
    }
    // Refresh failed — session expired
    onSessionExpired?.();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed with ${response.status}`);
  }
  return data as T;
}

export const api = {
  register: (body: { email: string; password: string; username: string; displayName: string }) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: (tokens: AuthTokens) =>
    apiRequest<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }),
  me: (tokens: AuthTokens) => apiRequest<AuthUser>('/me', { tokens }),
  feed: (tokens: AuthTokens, cursor?: string | null) =>
    apiRequest<FeedResponse>(`/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
      tokens,
    }),
  myReviews: (tokens: AuthTokens, cursor?: string | null) =>
    apiRequest<FeedResponse>(`/feed/me${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
      tokens,
    }),
  userReviews: (tokens: AuthTokens, userId: string, cursor?: string | null) =>
    apiRequest<FeedResponse>(
      `/feed/users/${encodeURIComponent(userId)}${
        cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      }`,
      { tokens },
    ),
  searchMovies: (tokens: AuthTokens, query: string) =>
    apiRequest<{ items: MovieSummary[]; source: string }>(
      `/movies/search?q=${encodeURIComponent(query)}`,
      { tokens },
    ),
  browseMoviesByGenre: (tokens: AuthTokens, genreId: number) =>
    apiRequest<{ items: MovieSummary[]; source: string }>(
      `/movies/genre?genreId=${encodeURIComponent(String(genreId))}`,
      { tokens },
    ),
  importMovie: (tokens: AuthTokens, tmdbId: number) =>
    apiRequest<MovieSummary>(`/movies/tmdb/${tmdbId}/import`, { method: 'POST', tokens }),
  createReview: (
    tokens: AuthTokens,
    body: {
      movieId: string;
      rating: number;
      quickTake?: string;
      body?: string;
      tags?: string[];
      containsSpoilers: boolean;
    },
  ) => apiRequest<ReviewDetail>('/reviews', { method: 'POST', tokens, body: JSON.stringify(body) }),
  updateReview: (
    tokens: AuthTokens,
    id: string,
    body: {
      rating?: number;
      quickTake?: string;
      body?: string;
      tags?: string[];
      containsSpoilers?: boolean;
    },
  ) =>
    apiRequest<ReviewDetail>(`/reviews/${id}`, {
      method: 'PATCH',
      tokens,
      body: JSON.stringify(body),
    }),
  deleteReview: (tokens: AuthTokens, id: string) =>
    apiRequest<{ ok: boolean }>(`/reviews/${id}`, { method: 'DELETE', tokens }),
  review: (tokens: AuthTokens, id: string, commentSort?: 'best' | 'new') =>
    apiRequest<ReviewDetail>(
      `/reviews/${id}${commentSort ? `?commentSort=${encodeURIComponent(commentSort)}` : ''}`,
      { tokens },
    ),
  translate: (
    tokens: AuthTokens,
    body: {
      targetType: TranslationTargetType;
      targetId: string;
      targetLocale: string;
      sourceLocale?: string;
    },
  ) =>
    apiRequest<TranslationResponse>('/translations', {
      method: 'POST',
      tokens,
      body: JSON.stringify(body),
    }),
  createComment: (
    tokens: AuthTokens,
    reviewId: string,
    body: { body: string; parentCommentId?: string | null },
  ) =>
    apiRequest<ReviewComment>(`/reviews/${reviewId}/comments`, {
      method: 'POST',
      tokens,
      body: JSON.stringify(body),
    }),
  voteComment: (tokens: AuthTokens, reviewId: string, commentId: string, value: -1 | 1) =>
    apiRequest<ReviewComment>(`/reviews/${reviewId}/comments/${commentId}/votes`, {
      method: 'POST',
      tokens,
      body: JSON.stringify({ value }),
    }),
  removeCommentVote: (tokens: AuthTokens, reviewId: string, commentId: string) =>
    apiRequest<ReviewComment>(`/reviews/${reviewId}/comments/${commentId}/votes`, {
      method: 'DELETE',
      tokens,
    }),
  updateComment: (tokens: AuthTokens, reviewId: string, commentId: string, body: string) =>
    apiRequest<ReviewComment>(`/reviews/${reviewId}/comments/${commentId}`, {
      method: 'PATCH',
      tokens,
      body: JSON.stringify({ body }),
    }),
  deleteComment: (tokens: AuthTokens, reviewId: string, commentId: string) =>
    apiRequest<{ ok: boolean }>(`/reviews/${reviewId}/comments/${commentId}`, {
      method: 'DELETE',
      tokens,
    }),
  notifications: (tokens: AuthTokens) =>
    apiRequest<NotificationsResponse>('/notifications', { tokens }),
  markNotificationRead: (tokens: AuthTokens, id: string) =>
    apiRequest<NotificationItem>(`/notifications/${id}/read`, { method: 'POST', tokens }),
  markAllNotificationsRead: (tokens: AuthTokens) =>
    apiRequest<{ ok: boolean; count: number }>('/notifications/read-all', {
      method: 'POST',
      tokens,
    }),
  blockUser: (tokens: AuthTokens, id: string) =>
    apiRequest<{ ok: boolean }>(`/users/${id}/block`, { method: 'POST', tokens }),
  unblockUser: (tokens: AuthTokens, id: string) =>
    apiRequest<{ ok: boolean }>(`/users/${id}/block`, { method: 'DELETE', tokens }),
  report: (
    tokens: AuthTokens,
    body: {
      targetType: 'user' | 'review' | 'comment';
      targetId: string;
      reason: string;
      details?: string;
    },
  ) => apiRequest<{ id: string }>('/reports', { method: 'POST', tokens, body: JSON.stringify(body) }),
  searchUsers: (tokens: AuthTokens, query: string) =>
    apiRequest<
      Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        friendshipStatus: string | null;
      }>
    >(`/users/search?q=${encodeURIComponent(query)}`, { tokens }),
  sendFriendRequest: (tokens: AuthTokens, addresseeId: string) =>
    apiRequest<FriendRequest>('/friend-requests', {
      method: 'POST',
      tokens,
      body: JSON.stringify({ addresseeId }),
    }),
  incomingFriendRequests: (tokens: AuthTokens) =>
    apiRequest<FriendRequest[]>('/friend-requests/incoming', { tokens }),
  outgoingFriendRequests: (tokens: AuthTokens) =>
    apiRequest<FriendRequest[]>('/friend-requests/outgoing', { tokens }),
  acceptFriendRequest: (tokens: AuthTokens, id: string) =>
    apiRequest<FriendRequest>(`/friend-requests/${id}/accept`, { method: 'POST', tokens }),
  declineFriendRequest: (tokens: AuthTokens, id: string) =>
    apiRequest<FriendRequest>(`/friend-requests/${id}/decline`, { method: 'POST', tokens }),
  friends: (tokens: AuthTokens) => apiRequest<FriendSummary[]>('/friends', { tokens }),
};
