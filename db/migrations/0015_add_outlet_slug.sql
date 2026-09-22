ALTER TABLE "outlet" ADD COLUMN "slug" text;--> statement-breakpoint
WITH normalized AS (
  SELECT
    "id",
    "business_id",
    "created_at",
    COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'gerai'
    ) AS base_slug
  FROM "outlet"
), ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY "business_id", base_slug
      ORDER BY "created_at", "id"
    ) AS slug_rank
  FROM normalized
), candidates AS (
  SELECT
    *,
    CASE
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || slug_rank::text
    END AS candidate_slug
  FROM ranked
), deduplicated AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY "business_id", candidate_slug
      ORDER BY "created_at", "id"
    ) AS collision_rank
  FROM candidates
)
UPDATE "outlet" AS target
SET "slug" = CASE
  WHEN deduplicated.collision_rank = 1 THEN deduplicated.candidate_slug
  ELSE deduplicated.candidate_slug || '-' || LEFT(REPLACE(deduplicated."id", '-', ''), 8)
END
FROM deduplicated
WHERE target."id" = deduplicated."id";--> statement-breakpoint
ALTER TABLE "outlet" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "outlet_business_slug_idx" ON "outlet" USING btree ("business_id","slug");
