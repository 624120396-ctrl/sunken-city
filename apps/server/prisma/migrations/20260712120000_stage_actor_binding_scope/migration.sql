-- A binding actor is identified by its channel, owner, and bound character.
-- SQLite UNIQUE treats nullable columns as distinct, so this non-null scopeKey
-- is the database identity used by the service upsert.
ALTER TABLE "StageActorState" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT '';

-- Bound player records share a deterministic scope. Other existing actor rows
-- retain a unique legacy scope so this migration does not change their identity.
UPDATE "StageActorState"
SET "scopeKey" = CASE
  WHEN "actorKind" = 'PLAYER_CHARACTER'
    AND "ownerUserId" IS NOT NULL
    AND "characterId" IS NOT NULL
    THEN 'binding:' || "ownerUserId" || ':' || "characterId"
  ELSE 'legacy:' || "id"
END;

-- Before enforcing uniqueness, retain the most recently updated row for each
-- duplicated bound scope (ties use the greatest id). It is the authoritative
-- current runtime state; stale duplicates are removed. StageEvent.actorId and
-- StageSnapshot.projectionJson are scalar historical data with no foreign key
-- to StageActorState, so immutable event/snapshot history remains intact.
DELETE FROM "StageActorState" AS "stale"
WHERE "stale"."scopeKey" LIKE 'binding:%'
  AND EXISTS (
    SELECT 1
    FROM "StageActorState" AS "preferred"
    WHERE "preferred"."channelId" = "stale"."channelId"
      AND "preferred"."scopeKey" = "stale"."scopeKey"
      AND (
        "preferred"."updatedAt" > "stale"."updatedAt"
        OR ("preferred"."updatedAt" = "stale"."updatedAt" AND "preferred"."id" > "stale"."id")
      )
  );

CREATE UNIQUE INDEX "StageActorState_channelId_scopeKey_key"
  ON "StageActorState"("channelId", "scopeKey");
