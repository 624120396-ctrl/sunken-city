-- CreateTable
CREATE TABLE "RoomRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "lifecycle" TEXT NOT NULL DEFAULT 'PREPARING',
    "startedAt" DATETIME,
    "pausedAt" DATETIME,
    "finishingAt" DATETIME,
    "finishedAt" DATETIME,
    "cancelledAt" DATETIME,
    "finalizedById" TEXT,
    "startSnapshot" TEXT NOT NULL DEFAULT '{}',
    "finishSummary" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomRun_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomRun_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomRunParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomRunId" TEXT NOT NULL,
    "roomMemberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "characterId" TEXT,
    "initialSnapshot" TEXT NOT NULL DEFAULT '{}',
    "joinSnapshot" TEXT NOT NULL DEFAULT '{}',
    "finalSnapshot" TEXT NOT NULL DEFAULT '{}',
    "participationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedRunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftRunAt" DATETIME,
    CONSTRAINT "RoomRunParticipant_roomRunId_fkey" FOREIGN KEY ("roomRunId") REFERENCES "RoomRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomRunParticipant_roomMemberId_fkey" FOREIGN KEY ("roomMemberId") REFERENCES "RoomMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomRunParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomRunParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomCharacterLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    CONSTRAINT "RoomCharacterLock_roomRunId_fkey" FOREIGN KEY ("roomRunId") REFERENCES "RoomRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomCharacterLock_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomCharacterLock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomCharacterLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomRunId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "outcome" TEXT NOT NULL DEFAULT 'SURVIVED',
    "hpFinal" INTEGER,
    "mpFinal" INTEGER,
    "sanFinal" INTEGER,
    "expAward" INTEGER NOT NULL DEFAULT 0,
    "skillGrowth" TEXT NOT NULL DEFAULT '[]',
    "itemChanges" TEXT NOT NULL DEFAULT '[]',
    "kpNote" TEXT,
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomSettlement_roomRunId_fkey" FOREIGN KEY ("roomRunId") REFERENCES "RoomRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomSettlement_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomSettlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomRun_roomId_key" ON "RoomRun"("roomId");

-- CreateIndex
CREATE INDEX "RoomRun_lifecycle_idx" ON "RoomRun"("lifecycle");

-- CreateIndex
CREATE INDEX "RoomRunParticipant_roomRunId_idx" ON "RoomRunParticipant"("roomRunId");

-- CreateIndex
CREATE INDEX "RoomRunParticipant_userId_idx" ON "RoomRunParticipant"("userId");

-- CreateIndex
CREATE INDEX "RoomRunParticipant_characterId_idx" ON "RoomRunParticipant"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomRunParticipant_roomRunId_userId_key" ON "RoomRunParticipant"("roomRunId", "userId");

-- CreateIndex
CREATE INDEX "RoomCharacterLock_characterId_status_idx" ON "RoomCharacterLock"("characterId", "status");

-- CreateIndex
CREATE INDEX "RoomCharacterLock_roomId_idx" ON "RoomCharacterLock"("roomId");

-- CreateIndex
CREATE INDEX "RoomCharacterLock_roomRunId_idx" ON "RoomCharacterLock"("roomRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCharacterLock_activeKey_key" ON "RoomCharacterLock"("activeKey");

-- CreateIndex
CREATE INDEX "RoomSettlement_roomRunId_idx" ON "RoomSettlement"("roomRunId");

-- CreateIndex
CREATE INDEX "RoomSettlement_characterId_idx" ON "RoomSettlement"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSettlement_roomRunId_characterId_key" ON "RoomSettlement"("roomRunId", "characterId");
