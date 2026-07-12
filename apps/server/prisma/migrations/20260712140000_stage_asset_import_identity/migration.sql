-- A normalized import identity makes room+kind+sha256 deduplication atomic.
-- Existing duplicate rows are retained with a legacy-scoped key; one stable
-- canonical row keeps the normal key so no historical asset is deleted.
ALTER TABLE "StageAsset" ADD COLUMN "importKey" TEXT;
UPDATE "StageAsset" SET "importKey" = "kind" || ':' || "hash" WHERE "importKey" IS NULL;
UPDATE "StageAsset"
SET "importKey" = "importKey" || ':legacy:' || "id"
WHERE "id" NOT IN (
  SELECT COALESCE(MIN(CASE WHEN "deletedAt" IS NULL THEN "id" END), MIN("id"))
  FROM "StageAsset"
  GROUP BY "roomId", "kind", "hash"
);
CREATE UNIQUE INDEX "StageAsset_roomId_importKey_key" ON "StageAsset"("roomId", "importKey");
