import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  FeedResponse,
  MovieSummary,
  ReviewComment,
  ReviewDetail,
} from '@criticool/shared';

export type { ReviewComment, ReviewDetail };

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
  me: (tokens: AuthTokens) => apiRequest<AuthUser>('/me', { tokens }),
  feed: (tokens: AuthTokens, cursor?: string | null) =>
    apiRequest<FeedResponse>(`/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
      tokens,
    }),
  myReviews: (tokens: AuthTokens, cursor?: string | null) =>
    apiRequest<FeedResponse>(`/feed/me${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
      tokens,
    }),
  searchMovies: (tokens: AuthTokens, query: string) =>
    apiRequest<{ items: MovieSummary[]; source: string }>(
      `/movies/search?q=${encodeURIComponent(query)}`,
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
  review: (tokens: AuthTokens, id: string) => apiRequest<ReviewDetail>(`/reviews/${id}`, { tokens }),
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
