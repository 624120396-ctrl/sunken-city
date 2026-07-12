ALTER TABLE "Room" ADD COLUMN "stageEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "StageChannel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "subRoomId" TEXT,
  "privateThreadId" TEXT,
  "parentChannelId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DISABLED',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "timebaseStartedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inheritedFromChannelId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StageChannel_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StageEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "contractVersion" TEXT NOT NULL,
  "actorId" TEXT,
  "roomMessageId" TEXT,
  "operatorUserId" TEXT,
  "targetUserIds" TEXT NOT NULL DEFAULT '[]',
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "beforeRevision" INTEGER NOT NULL,
  "afterRevision" INTEGER NOT NULL,
  "payload" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StageEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "StageChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StageSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "contractVersion" TEXT NOT NULL,
  "projectionJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StageSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "StageChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StageActorState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "characterId" TEXT,
  "npcId" TEXT,
  "temporaryName" TEXT,
  "portraitPackId" TEXT,
  "portraitVariantId" TEXT,
  "zone" TEXT NOT NULL DEFAULT 'center',
  "entered" BOOLEAN NOT NULL DEFAULT false,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "lockedByKp" BOOLEAN NOT NULL DEFAULT false,
  "stateJson" TEXT NOT NULL DEFAULT '{}',
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StageActorState_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "StageChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StageAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PRIVATE_ROOM',
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "hash" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "proxyStorageKey" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "durationMs" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadataJson" TEXT NOT NULL DEFAULT '{}',
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StageAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PortraitPack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "characterId" TEXT,
  "name" TEXT NOT NULL,
  "defaultVariantId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PortraitPack_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PortraitVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "packId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "expression" TEXT,
  "action" TEXT,
  "anchorJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortraitVariant_packId_fkey" FOREIGN KEY ("packId") REFERENCES "PortraitPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StageThemePack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "manifestJson" TEXT NOT NULL,
  "assetIdsJson" TEXT NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StageThemePack_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StageChannel_roomId_kind_subRoomId_privateThreadId_key" ON "StageChannel"("roomId", "kind", "subRoomId", "privateThreadId");
CREATE INDEX "StageChannel_roomId_status_idx" ON "StageChannel"("roomId", "status");
CREATE UNIQUE INDEX "StageEvent_channelId_commandId_key" ON "StageEvent"("channelId", "commandId");
CREATE INDEX "StageEvent_channelId_afterRevision_idx" ON "StageEvent"("channelId", "afterRevision");
CREATE INDEX "StageEvent_roomId_createdAt_idx" ON "StageEvent"("roomId", "createdAt");
CREATE UNIQUE INDEX "StageSnapshot_channelId_revision_key" ON "StageSnapshot"("channelId", "revision");
CREATE INDEX "StageSnapshot_roomId_updatedAt_idx" ON "StageSnapshot"("roomId", "updatedAt");
CREATE INDEX "StageActorState_channelId_ownerUserId_idx" ON "StageActorState"("channelId", "ownerUserId");
CREATE INDEX "StageActorState_channelId_characterId_idx" ON "StageActorState"("channelId", "characterId");
CREATE INDEX "StageAsset_roomId_kind_createdAt_idx" ON "StageAsset"("roomId", "kind", "createdAt");
CREATE INDEX "StageAsset_hash_idx" ON "StageAsset"("hash");
CREATE INDEX "PortraitPack_roomId_ownerUserId_idx" ON "PortraitPack"("roomId", "ownerUserId");
CREATE INDEX "PortraitPack_roomId_characterId_idx" ON "PortraitPack"("roomId", "characterId");
CREATE UNIQUE INDEX "PortraitVariant_packId_label_key" ON "PortraitVariant"("packId", "label");
CREATE INDEX "StageThemePack_roomId_createdAt_idx" ON "StageThemePack"("roomId", "createdAt");
