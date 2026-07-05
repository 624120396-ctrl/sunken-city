-- CreateTable
CREATE TABLE "AiAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "jobId" TEXT,
    "createdById" TEXT,
    "assetType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "url" TEXT,
    "storagePath" TEXT,
    "mimeType" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'KP_ONLY',
    "linkedType" TEXT,
    "linkedId" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT,
    "modelId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AiAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AiAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiAsset_roomId_assetType_createdAt_idx" ON "AiAsset"("roomId", "assetType", "createdAt");

-- CreateIndex
CREATE INDEX "AiAsset_roomId_approvalStatus_idx" ON "AiAsset"("roomId", "approvalStatus");

-- CreateIndex
CREATE INDEX "AiAsset_jobId_idx" ON "AiAsset"("jobId");

-- CreateIndex
CREATE INDEX "AiAsset_linkedType_linkedId_idx" ON "AiAsset"("linkedType", "linkedId");
