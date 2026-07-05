-- CreateTable
CREATE TABLE "RoomSessionPrep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "checklist" TEXT NOT NULL DEFAULT '[]',
    "characterConfirmations" TEXT NOT NULL DEFAULT '{}',
    "publicNotes" TEXT NOT NULL DEFAULT '',
    "keeperNotes" TEXT NOT NULL DEFAULT '',
    "materialLinks" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomSessionPrep_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomCurrentFocus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "lastRecap" TEXT NOT NULL DEFAULT '',
    "currentObjective" TEXT NOT NULL DEFAULT '',
    "unresolvedQuestions" TEXT NOT NULL DEFAULT '[]',
    "pinnedMessage" TEXT NOT NULL DEFAULT '',
    "keeperNotes" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomCurrentFocus_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomSessionPrep_roomId_key" ON "RoomSessionPrep"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCurrentFocus_roomId_key" ON "RoomCurrentFocus"("roomId");
