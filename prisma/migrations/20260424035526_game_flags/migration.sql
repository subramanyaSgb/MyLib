-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "normTitle" TEXT NOT NULL,
    "coverUrl" TEXT,
    "releaseYear" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Game" ("coverUrl", "createdAt", "id", "normTitle", "releaseYear", "title") SELECT "coverUrl", "createdAt", "id", "normTitle", "releaseYear", "title" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE INDEX "Game_normTitle_idx" ON "Game"("normTitle");
CREATE INDEX "Game_isFavorite_idx" ON "Game"("isFavorite");
CREATE INDEX "Game_isHidden_idx" ON "Game"("isHidden");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
