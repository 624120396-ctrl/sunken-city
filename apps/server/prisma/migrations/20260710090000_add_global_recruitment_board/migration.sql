-- CreateTable
CREATE TABLE "GlobalRecruitmentPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "roomId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'EXTERNAL_EVENT',
    "title" TEXT NOT NULL,
    "systemOrTheme" TEXT NOT NULL,
    "playFormat" TEXT NOT NULL,
    "locationOrPlatform" TEXT NOT NULL,
    "scheduleText" TEXT NOT NULL,
    "playerCountMin" INTEGER NOT NULL DEFAULT 3,
    "playerCountMax" INTEGER NOT NULL DEFAULT 4,
    "experienceRequirement" TEXT NOT NULL DEFAULT '',
    "contactMethod" TEXT NOT NULL,
    "contactVisibility" TEXT NOT NULL DEFAULT 'RESPONDERS',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL DEFAULT '',
    "safetyNote" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "expiresAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GlobalRecruitmentPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GlobalRecruitmentPost_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalRecruitmentResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "contactNote" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GlobalRecruitmentResponse_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GlobalRecruitmentPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GlobalRecruitmentResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalRecruitmentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GlobalRecruitmentReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GlobalRecruitmentPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GlobalRecruitmentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GlobalRecruitmentPost_status_expiresAt_idx" ON "GlobalRecruitmentPost"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentPost_sourceType_idx" ON "GlobalRecruitmentPost"("sourceType");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentPost_authorId_status_idx" ON "GlobalRecruitmentPost"("authorId", "status");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentPost_roomId_idx" ON "GlobalRecruitmentPost"("roomId");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentPost_createdAt_idx" ON "GlobalRecruitmentPost"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalRecruitmentResponse_postId_userId_key" ON "GlobalRecruitmentResponse"("postId", "userId");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentResponse_postId_status_idx" ON "GlobalRecruitmentResponse"("postId", "status");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentResponse_userId_status_idx" ON "GlobalRecruitmentResponse"("userId", "status");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentReport_postId_status_idx" ON "GlobalRecruitmentReport"("postId", "status");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentReport_reporterId_idx" ON "GlobalRecruitmentReport"("reporterId");

-- CreateIndex
CREATE INDEX "GlobalRecruitmentReport_status_createdAt_idx" ON "GlobalRecruitmentReport"("status", "createdAt");
