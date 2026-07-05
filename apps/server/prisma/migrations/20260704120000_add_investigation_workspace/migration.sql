-- CreateTable
CREATE TABLE "InvestigationClue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREVEALED',
    "visibility" TEXT NOT NULL DEFAULT 'KP_ONLY',
    "npcId" TEXT,
    "sceneId" TEXT,
    "createdById" TEXT NOT NULL,
    "revealedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvestigationClue_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestigationNpc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "publicProfile" TEXT NOT NULL DEFAULT '',
    "keeperNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'UNSEEN',
    "visibility" TEXT NOT NULL DEFAULT 'KP_ONLY',
    "createdById" TEXT NOT NULL,
    "revealedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvestigationNpc_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestigationScene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicSummary" TEXT NOT NULL DEFAULT '',
    "keeperNotes" TEXT NOT NULL DEFAULT '',
    "atmosphere" TEXT NOT NULL DEFAULT 'normal',
    "imageUrl" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvestigationScene_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestigationLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestigationLogEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KpPrivateNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KpPrivateNote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InvestigationClue_roomId_visibility_idx" ON "InvestigationClue"("roomId", "visibility");

-- CreateIndex
CREATE INDEX "InvestigationClue_roomId_status_idx" ON "InvestigationClue"("roomId", "status");

-- CreateIndex
CREATE INDEX "InvestigationNpc_roomId_visibility_idx" ON "InvestigationNpc"("roomId", "visibility");

-- CreateIndex
CREATE INDEX "InvestigationNpc_roomId_status_idx" ON "InvestigationNpc"("roomId", "status");

-- CreateIndex
CREATE INDEX "InvestigationScene_roomId_isCurrent_idx" ON "InvestigationScene"("roomId", "isCurrent");

-- CreateIndex
CREATE INDEX "InvestigationScene_roomId_sortOrder_idx" ON "InvestigationScene"("roomId", "sortOrder");

-- CreateIndex
CREATE INDEX "InvestigationLogEntry_roomId_visibility_createdAt_idx" ON "InvestigationLogEntry"("roomId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "InvestigationLogEntry_roomId_isPinned_idx" ON "InvestigationLogEntry"("roomId", "isPinned");

-- CreateIndex
CREATE INDEX "KpPrivateNote_roomId_userId_idx" ON "KpPrivateNote"("roomId", "userId");
