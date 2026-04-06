-- CreateTable
CREATE TABLE "PrivateMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrivateMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrivateMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Countdown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Countdown_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "sessionStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRolls" INTEGER NOT NULL DEFAULT 0,
    "successRolls" INTEGER NOT NULL DEFAULT 0,
    "failRolls" INTEGER NOT NULL DEFAULT 0,
    "mostUsedSkill" TEXT,
    "lastUpdated" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 25,
    "gender" TEXT,
    "avatarUrl" TEXT,
    "quickSkills" TEXT NOT NULL DEFAULT '["侦查","聆听","图书馆使用","心理学","话术"]',
    "str" INTEGER NOT NULL DEFAULT 50,
    "dex" INTEGER NOT NULL DEFAULT 50,
    "con" INTEGER NOT NULL DEFAULT 50,
    "siz" INTEGER NOT NULL DEFAULT 50,
    "app" INTEGER NOT NULL DEFAULT 50,
    "int" INTEGER NOT NULL DEFAULT 50,
    "pow" INTEGER NOT NULL DEFAULT 50,
    "edu" INTEGER NOT NULL DEFAULT 50,
    "luck" INTEGER NOT NULL DEFAULT 50,
    "hp" INTEGER NOT NULL DEFAULT 10,
    "mp" INTEGER NOT NULL DEFAULT 10,
    "san" INTEGER NOT NULL DEFAULT 50,
    "maxHp" INTEGER NOT NULL DEFAULT 10,
    "maxMp" INTEGER NOT NULL DEFAULT 10,
    "maxSan" INTEGER NOT NULL DEFAULT 50,
    "mov" INTEGER NOT NULL DEFAULT 8,
    "build" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT NOT NULL DEFAULT '{}',
    "weapons" TEXT NOT NULL DEFAULT '[]',
    "armor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("age", "app", "armor", "build", "con", "createdAt", "dex", "edu", "gender", "hp", "id", "int", "luck", "maxHp", "maxMp", "maxSan", "mov", "mp", "name", "occupation", "pow", "san", "siz", "skills", "str", "updatedAt", "userId", "weapons") SELECT "age", "app", "armor", "build", "con", "createdAt", "dex", "edu", "gender", "hp", "id", "int", "luck", "maxHp", "maxMp", "maxSan", "mov", "mp", "name", "occupation", "pow", "san", "siz", "skills", "str", "updatedAt", "userId", "weapons" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "atmosphere" TEXT NOT NULL DEFAULT 'normal',
    "sceneDesc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Room" ("createdAt", "creatorId", "description", "id", "name", "roomId", "status", "updatedAt") SELECT "createdAt", "creatorId", "description", "id", "name", "roomId", "status", "updatedAt" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE UNIQUE INDEX "Room_roomId_key" ON "Room"("roomId");
CREATE TABLE "new_RoomMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "statusTags" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RoomMember" ("characterId", "id", "joinedAt", "leftAt", "role", "roomId", "userId") SELECT "characterId", "id", "joinedAt", "leftAt", "role", "roomId", "userId" FROM "RoomMember";
DROP TABLE "RoomMember";
ALTER TABLE "new_RoomMember" RENAME TO "RoomMember";
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PrivateMessage_roomId_receiverId_idx" ON "PrivateMessage"("roomId", "receiverId");

-- CreateIndex
CREATE INDEX "PrivateMessage_createdAt_idx" ON "PrivateMessage"("createdAt");

-- CreateIndex
CREATE INDEX "Countdown_roomId_idx" ON "Countdown"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomStats_roomId_key" ON "RoomStats"("roomId");

-- CreateIndex
CREATE INDEX "RoomStats_roomId_idx" ON "RoomStats"("roomId");
