CREATE TABLE "RoomSchedulePoll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closesAt" DATETIME,
    "finalizedOptionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomSchedulePoll_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomSchedulePoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomSchedulePoll_finalizedOptionId_fkey" FOREIGN KEY ("finalizedOptionId") REFERENCES "RoomScheduleOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "RoomScheduleOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomScheduleOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "RoomSchedulePoll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomScheduleVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomScheduleVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "RoomScheduleOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomScheduleVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RoomSchedulePoll_roomId_status_idx" ON "RoomSchedulePoll"("roomId", "status");
CREATE INDEX "RoomSchedulePoll_createdById_idx" ON "RoomSchedulePoll"("createdById");
CREATE INDEX "RoomSchedulePoll_closesAt_idx" ON "RoomSchedulePoll"("closesAt");
CREATE INDEX "RoomScheduleOption_pollId_position_idx" ON "RoomScheduleOption"("pollId", "position");
CREATE INDEX "RoomScheduleOption_startsAt_idx" ON "RoomScheduleOption"("startsAt");
CREATE UNIQUE INDEX "RoomScheduleVote_optionId_userId_key" ON "RoomScheduleVote"("optionId", "userId");
CREATE INDEX "RoomScheduleVote_userId_idx" ON "RoomScheduleVote"("userId");
CREATE INDEX "RoomScheduleVote_optionId_status_idx" ON "RoomScheduleVote"("optionId", "status");
