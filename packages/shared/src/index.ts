export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type MovieSummary = {
  id?: string;
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

export type FeedItem = {
  reviewId: string;
  createdAt: string;
  rating: number;
  quickTake: string | null;
  tags: string[];
  containsSpoilers: boolean;
  commentCount: number;
  commentParticipants: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  movie: MovieSummary;
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

export type ReviewComment = {
  id: string;
  reviewId: string;
  parentCommentId: string | null;
  body: string;
  depth: number;
  score: number;
  viewerVote: -1 | 0 | 1;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replies: ReviewComment[];
};

export type ReviewDetail = {
  id: string;
  createdAt: string;
  updatedAt: string;
  rating: number;
  quickTake: string | null;
  body: string | null;
  tags: string[];
  containsSpoilers: boolean;
  visibility: 'private' | 'friends';
  commentCount: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  movie: MovieSummary;
  comments: ReviewComment[];
};
