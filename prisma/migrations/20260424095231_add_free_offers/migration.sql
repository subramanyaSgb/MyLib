-- CreateTable
CREATE TABLE "FreeOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "url" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "originalCents" INTEGER,
    "currency" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "FreeOffer_endsAt_idx" ON "FreeOffer"("endsAt");

-- CreateIndex
CREATE INDEX "FreeOffer_offerType_idx" ON "FreeOffer"("offerType");

-- CreateIndex
CREATE INDEX "FreeOffer_dismissedAt_idx" ON "FreeOffer"("dismissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FreeOffer_storeId_externalId_key" ON "FreeOffer"("storeId", "externalId");
