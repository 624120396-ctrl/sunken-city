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
INSERT INTO "new_Character" ("age", "app", "armor", "build", "con", "createdAt", "dex", "edu", "gender", "hp", "id", "int", "luck", "mov", "mp", "name", "occupation", "pow", "san", "siz", "skills", "str", "updatedAt", "userId", "weapons") SELECT "age", "app", "armor", "build", "con", "createdAt", "dex", "edu", "gender", "hp", "id", "int", "luck", "mov", "mp", "name", "occupation", "pow", "san", "siz", "skills", "str", "updatedAt", "userId", "weapons" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
