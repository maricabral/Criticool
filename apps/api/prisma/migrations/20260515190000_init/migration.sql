CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE "ReviewVisibility" AS ENUM ('private', 'friends');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "avatar_url" TEXT,
  "bio" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'en-US',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "password_hash" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "device_name" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "friendships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" UUID NOT NULL,
  "addressee_id" UUID NOT NULL,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "responded_at" TIMESTAMPTZ,
  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_not_self" CHECK ("requester_id" <> "addressee_id")
);

CREATE TABLE "blocks" (
  "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "blocks_not_self" CHECK ("blocker_id" <> "blocked_id")
);

CREATE TABLE "movies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tmdb_id" INTEGER NOT NULL,
  "imdb_id" TEXT,
  "title" TEXT NOT NULL,
  "original_title" TEXT,
  "overview" TEXT,
  "release_date" DATE,
  "runtime_minutes" INTEGER,
  "original_language" TEXT,
  "poster_path" TEXT,
  "backdrop_path" TEXT,
  "tmdb_vote_average" DECIMAL(3,1),
  "tmdb_vote_count" INTEGER,
  "popularity" DECIMAL(10,3),
  "status" TEXT,
  "adult" BOOLEAN NOT NULL DEFAULT false,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movie_genres" (
  "tmdb_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("tmdb_id")
);

CREATE TABLE "movie_genre_links" (
  "movie_id" UUID NOT NULL,
  "genre_tmdb_id" INTEGER NOT NULL,
  CONSTRAINT "movie_genre_links_pkey" PRIMARY KEY ("movie_id", "genre_tmdb_id")
);

CREATE TABLE "reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "movie_id" UUID NOT NULL,
  "rating" DECIMAL(2,1) NOT NULL,
  "quick_take" TEXT,
  "body" TEXT,
  "contains_spoilers" BOOLEAN NOT NULL DEFAULT false,
  "visibility" "ReviewVisibility" NOT NULL DEFAULT 'friends',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 0 AND "rating" <= 5)
);

CREATE TABLE "review_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "review_id" UUID NOT NULL,
  "rating" DECIMAL(2,1) NOT NULL,
  "quick_take" TEXT,
  "body" TEXT,
  "contains_spoilers" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "review_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "review_id" UUID NOT NULL,
  "parent_comment_id" UUID,
  "user_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comments_depth_cap" CHECK ("depth" >= 0 AND "depth" <= 3)
);

CREATE TABLE "comment_votes" (
  "comment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "value" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("comment_id", "user_id"),
  CONSTRAINT "comment_votes_value" CHECK ("value" IN (-1, 1))
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "auth_accounts_provider_provider_user_id_key" ON "auth_accounts"("provider", "provider_user_id");
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");
CREATE UNIQUE INDEX "friendships_requester_id_addressee_id_key" ON "friendships"("requester_id", "addressee_id");
CREATE UNIQUE INDEX "movies_tmdb_id_key" ON "movies"("tmdb_id");
CREATE UNIQUE INDEX "reviews_user_id_movie_id_key" ON "reviews"("user_id", "movie_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "friendships_requester_id_status_idx" ON "friendships"("requester_id", "status");
CREATE INDEX "friendships_addressee_id_status_idx" ON "friendships"("addressee_id", "status");
CREATE INDEX "movies_title_idx" ON "movies"("title");
CREATE INDEX "movies_release_date_idx" ON "movies"("release_date");
CREATE INDEX "reviews_user_id_created_at_idx" ON "reviews"("user_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "reviews_movie_id_created_at_idx" ON "reviews"("movie_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "comments_review_id_parent_comment_id_score_created_at_idx" ON "comments"("review_id", "parent_comment_id", "score" DESC, "created_at");

ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movie_genre_links" ADD CONSTRAINT "movie_genre_links_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movie_genre_links" ADD CONSTRAINT "movie_genre_links_genre_tmdb_id_fkey" FOREIGN KEY ("genre_tmdb_id") REFERENCES "movie_genres"("tmdb_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_revisions" ADD CONSTRAINT "review_revisions_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
