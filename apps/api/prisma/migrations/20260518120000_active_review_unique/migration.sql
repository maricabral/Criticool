-- DropIndex
DROP INDEX IF EXISTS "reviews_user_id_movie_id_key";

-- CreateIndex: one active (non-deleted) review per user/movie
CREATE UNIQUE INDEX "reviews_user_id_movie_id_active" ON "reviews" ("user_id", "movie_id") WHERE "deleted_at" IS NULL;
