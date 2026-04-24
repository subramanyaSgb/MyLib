-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishlistItemId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT,
    "discountPct" INTEGER,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_wishlistItemId_fkey" FOREIGN KEY ("wishlistItemId") REFERENCES "WishlistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishlistItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "targetCents" INTEGER,
    "prevLowCents" INTEGER,
    "currency" TEXT,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME,
    CONSTRAINT "PriceAlert_wishlistItemId_fkey" FOREIGN KEY ("wishlistItemId") REFERENCES "WishlistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_wishlistItemId_capturedAt_idx" ON "PriceSnapshot"("wishlistItemId", "capturedAt");

-- CreateIndex
CREATE INDEX "PriceAlert_wishlistItemId_idx" ON "PriceAlert"("wishlistItemId");

-- CreateIndex
CREATE INDEX "PriceAlert_dismissedAt_idx" ON "PriceAlert"("dismissedAt");

-- CreateIndex
CREATE INDEX "PriceAlert_firedAt_idx" ON "PriceAlert"("firedAt");
