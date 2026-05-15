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
