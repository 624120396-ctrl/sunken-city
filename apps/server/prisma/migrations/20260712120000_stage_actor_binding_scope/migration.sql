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

-- Before enforcing uniqueness, map every stale binding actor to the most
-- recently updated row in its scope (ties use the greatest id). This map is
-- used to preserve the current snapshot authority before stale runtime rows
-- are removed.
CREATE TEMP TABLE "_StageActorCanonicalMap" (
  "staleActorId" TEXT NOT NULL PRIMARY KEY,
  "preferredActorId" TEXT NOT NULL
);

INSERT INTO "_StageActorCanonicalMap" ("staleActorId", "preferredActorId")
SELECT "stale"."id", (
  SELECT "preferred"."id"
  FROM "StageActorState" AS "preferred"
  WHERE "preferred"."channelId" = "stale"."channelId"
    AND "preferred"."scopeKey" = "stale"."scopeKey"
  ORDER BY "preferred"."updatedAt" DESC, "preferred"."id" DESC
  LIMIT 1
)
FROM "StageActorState" AS "stale"
WHERE "stale"."scopeKey" LIKE 'binding:%'
  AND "stale"."id" <> (
    SELECT "preferred"."id"
    FROM "StageActorState" AS "preferred"
    WHERE "preferred"."channelId" = "stale"."channelId"
      AND "preferred"."scopeKey" = "stale"."scopeKey"
    ORDER BY "preferred"."updatedAt" DESC, "preferred"."id" DESC
    LIMIT 1
  );

-- StageSnapshot is the recovery/current-state boundary, so rewrite its actor
-- ids before deleting stale rows. SQLite JSON1 is intentionally required: a
-- missing JSON1 implementation fails this migration rather than silently
-- retaining an authorizable stale actor. StageEvent remains immutable source
-- history and is deliberately not rewritten.
UPDATE "StageSnapshot"
SET "projectionJson" = json_set(
  "projectionJson",
  '$.actors',
  (
    SELECT json_group_array(
      CASE
        WHEN "_StageActorCanonicalMap"."preferredActorId" IS NULL THEN json("actor"."value")
        ELSE json_set("actor"."value", '$.actorId', "_StageActorCanonicalMap"."preferredActorId")
      END
    )
    FROM json_each("StageSnapshot"."projectionJson", '$.actors') AS "actor"
    LEFT JOIN "_StageActorCanonicalMap"
      ON json_extract("actor"."value", '$.actorId') = "_StageActorCanonicalMap"."staleActorId"
  )
)
WHERE EXISTS (
  SELECT 1
  FROM json_each("StageSnapshot"."projectionJson", '$.actors') AS "actor"
  INNER JOIN "_StageActorCanonicalMap"
    ON json_extract("actor"."value", '$.actorId') = "_StageActorCanonicalMap"."staleActorId"
);

-- The preferred record is the authoritative current runtime state. The map
-- above has already repaired every authority snapshot that referenced a stale
-- id, while immutable StageEvent source history keeps its original actorId.
DELETE FROM "StageActorState" AS "stale"
WHERE "stale"."id" IN (SELECT "staleActorId" FROM "_StageActorCanonicalMap");

DROP TABLE "_StageActorCanonicalMap";

CREATE UNIQUE INDEX "StageActorState_channelId_scopeKey_key"
  ON "StageActorState"("channelId", "scopeKey");
