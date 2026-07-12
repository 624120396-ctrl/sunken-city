-- SQLite UNIQUE treats NULL values as distinct, so the old nullable composite
-- index could permit multiple MAIN_ROOM channels. scopeKey is non-null and is
-- the single application/database identity for one channel scope in a room.
ALTER TABLE "StageChannel" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT '';

UPDATE "StageChannel"
SET "scopeKey" = CASE "kind"
  WHEN 'MAIN_ROOM' THEN 'main'
  WHEN 'SUB_ROOM' THEN 'sub:' || COALESCE("subRoomId", "id")
  WHEN 'PRIVATE_THREAD' THEN 'private:' || COALESCE("privateThreadId", "id")
  ELSE 'legacy:' || "id"
END;

-- Preserve any legacy duplicate MAIN_ROOM records for audit/replay but make
-- exactly one canonical main scope per room before enforcing uniqueness.
UPDATE "StageChannel"
SET "scopeKey" = 'legacy-main:' || "id"
WHERE "kind" = 'MAIN_ROOM'
  AND "id" NOT IN (
    SELECT MIN("id") FROM "StageChannel" WHERE "kind" = 'MAIN_ROOM' GROUP BY "roomId"
  );

CREATE UNIQUE INDEX "StageChannel_roomId_scopeKey_key" ON "StageChannel"("roomId", "scopeKey");
