CREATE TABLE "RoomRecruitmentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "headline" TEXT NOT NULL DEFAULT '',
    "pitch" TEXT NOT NULL DEFAULT '',
    "styleTags" TEXT NOT NULL DEFAULT '[]',
    "scheduleText" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '',
    "safetyTools" TEXT NOT NULL DEFAULT '',
    "playerCountMin" INTEGER NOT NULL DEFAULT 3,
    "playerCountMax" INTEGER NOT NULL DEFAULT 4,
    "newcomerFriendly" BOOLEAN NOT NULL DEFAULT true,
    "plGuide" TEXT NOT NULL DEFAULT '',
    "kpChecklist" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomRecruitmentProfile_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomJoinApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "experienceNote" TEXT NOT NULL DEFAULT '',
    "availabilityNote" TEXT NOT NULL DEFAULT '',
    "preferredStyleTags" TEXT NOT NULL DEFAULT '[]',
    "reviewerId" TEXT,
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomJoinApplication_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomJoinApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomJoinApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoomRecruitmentProfile_roomId_key" ON "RoomRecruitmentProfile"("roomId");
CREATE INDEX "RoomRecruitmentProfile_status_idx" ON "RoomRecruitmentProfile"("status");
CREATE INDEX "RoomRecruitmentProfile_newcomerFriendly_idx" ON "RoomRecruitmentProfile"("newcomerFriendly");
CREATE UNIQUE INDEX "RoomJoinApplication_roomId_userId_key" ON "RoomJoinApplication"("roomId", "userId");
CREATE INDEX "RoomJoinApplication_roomId_status_idx" ON "RoomJoinApplication"("roomId", "status");
CREATE INDEX "RoomJoinApplication_userId_status_idx" ON "RoomJoinApplication"("userId", "status");
