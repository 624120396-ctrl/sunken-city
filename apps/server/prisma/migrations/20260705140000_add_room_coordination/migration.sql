CREATE TABLE "RoomNextSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "title" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomNextSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomAttendanceConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAttendanceConfirmation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAttendanceConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomAnnouncement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoomNextSession_roomId_key" ON "RoomNextSession"("roomId");
CREATE INDEX "RoomNextSession_scheduledAt_idx" ON "RoomNextSession"("scheduledAt");
CREATE INDEX "RoomNextSession_status_idx" ON "RoomNextSession"("status");
CREATE UNIQUE INDEX "RoomAttendanceConfirmation_roomId_userId_key" ON "RoomAttendanceConfirmation"("roomId", "userId");
CREATE INDEX "RoomAttendanceConfirmation_roomId_status_idx" ON "RoomAttendanceConfirmation"("roomId", "status");
CREATE INDEX "RoomAnnouncement_roomId_isPinned_idx" ON "RoomAnnouncement"("roomId", "isPinned");
CREATE INDEX "RoomAnnouncement_roomId_createdAt_idx" ON "RoomAnnouncement"("roomId", "createdAt");
