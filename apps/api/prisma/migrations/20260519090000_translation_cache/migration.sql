CREATE TABLE "translation_caches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "target_version" TEXT NOT NULL,
    "source_locale" TEXT NOT NULL DEFAULT 'und',
    "target_locale" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_caches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "translation_caches_target_type_target_id_target_version_source_locale_target_locale_key"
ON "translation_caches"("target_type", "target_id", "target_version", "source_locale", "target_locale");

CREATE INDEX "translation_caches_target_type_target_id_idx"
ON "translation_caches"("target_type", "target_id");
