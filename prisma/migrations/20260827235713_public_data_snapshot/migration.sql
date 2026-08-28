-- AlterTable
ALTER TABLE "Property" ADD COLUMN "latitude" REAL;
ALTER TABLE "Property" ADD COLUMN "longitude" REAL;

-- CreateTable
CREATE TABLE "PublicDataSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "fetchStatus" TEXT NOT NULL,
    "fetchNote" TEXT,
    "areaAvgUnitPricePerSqm" INTEGER,
    "areaPriceYear" INTEGER,
    "areaPriceQuarter" INTEGER,
    "useZone" TEXT,
    "stationDailyUsers" INTEGER,
    "stationUsageYear" INTEGER,
    "floodRiskArea" BOOLEAN,
    "tsunamiRiskArea" BOOLEAN,
    "landslideRiskArea" BOOLEAN,
    "stormSurgeRiskArea" BOOLEAN,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicDataSnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicDataSnapshot_propertyId_key" ON "PublicDataSnapshot"("propertyId");
