-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "externalId" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "credsEnc" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" DATETIME,
    "lastSyncOk" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    CONSTRAINT "Account_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "normTitle" TEXT NOT NULL,
    "coverUrl" TEXT,
    "releaseYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GameOnStore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeGameId" TEXT NOT NULL,
    "storeTitle" TEXT NOT NULL,
    "coverUrl" TEXT,
    "storeUrl" TEXT,
    CONSTRAINT "GameOnStore_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OwnedCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "gameOnStoreId" TEXT NOT NULL,
    "playtimeMin" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" DATETIME,
    "purchasedAt" DATETIME,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnedCopy_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnedCopy_gameOnStoreId_fkey" FOREIGN KEY ("gameOnStoreId") REFERENCES "GameOnStore" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Account_storeId_idx" ON "Account"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_storeId_externalId_key" ON "Account"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "Game_normTitle_idx" ON "Game"("normTitle");

-- CreateIndex
CREATE INDEX "GameOnStore_gameId_idx" ON "GameOnStore"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameOnStore_storeId_storeGameId_key" ON "GameOnStore"("storeId", "storeGameId");

-- CreateIndex
CREATE INDEX "OwnedCopy_accountId_idx" ON "OwnedCopy"("accountId");

-- CreateIndex
CREATE INDEX "OwnedCopy_gameOnStoreId_idx" ON "OwnedCopy"("gameOnStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnedCopy_accountId_gameOnStoreId_key" ON "OwnedCopy"("accountId", "gameOnStoreId");
