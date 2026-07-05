CREATE TABLE "RoomCommunicationState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "currentTopic" TEXT NOT NULL DEFAULT '',
    "spotlightUserId" TEXT,
    "keeperPrompt" TEXT NOT NULL DEFAULT '',
    "environmentChecklist" TEXT NOT NULL DEFAULT '[]',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomCommunicationState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomActionQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SPEAK',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "requesterUserId" TEXT,
    "targetUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomActionQueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoomCommunicationState_roomId_key" ON "RoomCommunicationState"("roomId");
CREATE INDEX "RoomActionQueueItem_roomId_status_sortOrder_idx" ON "RoomActionQueueItem"("roomId", "status", "sortOrder");
CREATE INDEX "RoomActionQueueItem_roomId_createdAt_idx" ON "RoomActionQueueItem"("roomId", "createdAt");
