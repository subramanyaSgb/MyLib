-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "storeHint" TEXT,
    "monthlyCostCents" INTEGER,
    "currency" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "refreshedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SubCatalogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normTitle" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT,
    "coverUrl" TEXT,
    CONSTRAINT "SubCatalogEntry_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SubCatalogEntry_normTitle_idx" ON "SubCatalogEntry"("normTitle");

-- CreateIndex
CREATE UNIQUE INDEX "SubCatalogEntry_subscriptionId_normTitle_key" ON "SubCatalogEntry"("subscriptionId", "normTitle");
