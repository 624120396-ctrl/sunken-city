-- CreateTable
CREATE TABLE "CombatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "result" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SessionReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "combatRounds" INTEGER NOT NULL DEFAULT 0,
    "diceRollCount" INTEGER NOT NULL DEFAULT 0,
    "keyEvents" TEXT NOT NULL DEFAULT '[]',
    "characterGrowth" TEXT NOT NULL DEFAULT '[]',
    "exportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CombatLog_roomId_idx" ON "CombatLog"("roomId");

-- CreateIndex
CREATE INDEX "SessionReport_roomId_idx" ON "SessionReport"("roomId");
