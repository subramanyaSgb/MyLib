-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeGameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "storeUrl" TEXT,
    "fullPriceCents" INTEGER,
    "currentPriceCents" INTEGER,
    "discountPct" INTEGER,
    "currency" TEXT,
    "isOnSale" BOOLEAN NOT NULL DEFAULT false,
    "targetPriceCents" INTEGER,
    "gameId" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WishlistItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WishlistItem_accountId_idx" ON "WishlistItem"("accountId");

-- CreateIndex
CREATE INDEX "WishlistItem_gameId_idx" ON "WishlistItem"("gameId");

-- CreateIndex
CREATE INDEX "WishlistItem_isOnSale_idx" ON "WishlistItem"("isOnSale");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_accountId_storeGameId_key" ON "WishlistItem"("accountId", "storeGameId");
