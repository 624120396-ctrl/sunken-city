-- CreateTable
CREATE TABLE "RoomAiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "textAssistantEnabled" BOOLEAN NOT NULL DEFAULT false,
    "imageWorkshopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "voiceReservedStatus" TEXT NOT NULL DEFAULT 'DISABLED_READ_ONLY',
    "defaultTextProvider" TEXT,
    "defaultTextModelId" TEXT,
    "defaultCharacterProvider" TEXT,
    "defaultCharacterModelId" TEXT,
    "defaultImageProvider" TEXT,
    "defaultImageModelId" TEXT,
    "playerVisibleContextEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kpPrivateContextEnabled" BOOLEAN NOT NULL DEFAULT false,
    "monthlyCostLimitCents" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomAiSettings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAiSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "createdById" TEXT,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'KP_ONLY',
    "contextScope" TEXT NOT NULL DEFAULT 'PLAYER_VISIBLE',
    "provider" TEXT,
    "modelId" TEXT,
    "inputJson" TEXT NOT NULL DEFAULT '{}',
    "outputJson" TEXT,
    "errorMessage" TEXT,
    "providerRequestId" TEXT,
    "estimatedInputUnits" INTEGER,
    "estimatedOutputUnits" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "AiJob_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiUsageLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "jobId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "inputUnits" INTEGER NOT NULL DEFAULT 0,
    "outputUnits" INTEGER NOT NULL DEFAULT 0,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
    "providerRequestId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLedger_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiUsageLedger_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AiUsageLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiContextSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdById" TEXT,
    "contextScope" TEXT NOT NULL DEFAULT 'PLAYER_VISIBLE',
    "sourceVersion" TEXT NOT NULL DEFAULT 'room-ai-context-v1',
    "snapshotJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiContextSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiContextSnapshot_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AiContextSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomAiSettings_roomId_key" ON "RoomAiSettings"("roomId");

-- CreateIndex
CREATE INDEX "AiJob_roomId_status_idx" ON "AiJob"("roomId", "status");

-- CreateIndex
CREATE INDEX "AiJob_roomId_taskType_idx" ON "AiJob"("roomId", "taskType");

-- CreateIndex
CREATE INDEX "AiJob_createdById_createdAt_idx" ON "AiJob"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLedger_roomId_createdAt_idx" ON "AiUsageLedger"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLedger_jobId_idx" ON "AiUsageLedger"("jobId");

-- CreateIndex
CREATE INDEX "AiUsageLedger_provider_model_idx" ON "AiUsageLedger"("provider", "model");

-- CreateIndex
CREATE INDEX "AiUsageLedger_unitType_idx" ON "AiUsageLedger"("unitType");

-- CreateIndex
CREATE INDEX "AiContextSnapshot_roomId_createdAt_idx" ON "AiContextSnapshot"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "AiContextSnapshot_jobId_idx" ON "AiContextSnapshot"("jobId");

-- CreateIndex
CREATE INDEX "AiContextSnapshot_contextScope_idx" ON "AiContextSnapshot"("contextScope");
