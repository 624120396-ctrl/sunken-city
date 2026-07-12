-- Private stage-channel discovery must remain server-side access filtered.
-- Store the minimal participant id list required to project PRIVATE_THREAD channels.
ALTER TABLE "StageChannel" ADD COLUMN "participantUserIds" TEXT NOT NULL DEFAULT '[]';
