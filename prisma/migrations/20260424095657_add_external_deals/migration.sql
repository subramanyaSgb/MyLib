-- CreateTable
CREATE TABLE "ExternalDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishlistItemId" TEXT NOT NULL,
    "bestShop" TEXT NOT NULL,
    "bestShopName" TEXT NOT NULL,
    "bestPriceCents" INTEGER NOT NULL,
    "bestUrl" TEXT,
    "historicalLowCents" INTEGER,
    "historicalLowShop" TEXT,
    "currency" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalDeal_wishlistItemId_fkey" FOREIGN KEY ("wishlistItemId") REFERENCES "WishlistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDeal_wishlistItemId_key" ON "ExternalDeal"("wishlistItemId");

-- CreateIndex
CREATE INDEX "ExternalDeal_wishlistItemId_idx" ON "ExternalDeal"("wishlistItemId");
