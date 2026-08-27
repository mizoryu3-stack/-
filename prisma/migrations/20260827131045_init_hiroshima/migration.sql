-- CreateTable
CREATE TABLE "Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "rent" INTEGER NOT NULL,
    "managementFee" INTEGER NOT NULL DEFAULT 0,
    "layout" TEXT NOT NULL,
    "areaSqm" REAL NOT NULL,
    "builtYear" INTEGER NOT NULL,
    "stationName" TEXT,
    "stationWalkMin" INTEGER NOT NULL,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "keyMoney" INTEGER NOT NULL DEFAULT 0,
    "initialCost" INTEGER,
    "photoUrl" TEXT,
    "memo" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "fetchedAt" DATETIME,
    "minpakuScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NearbyAttraction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    CONSTRAINT "NearbyAttraction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorListing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "platform" TEXT,
    "distanceKm" REAL NOT NULL,
    CONSTRAINT "CompetitorListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationInput" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "nightlyPrice" INTEGER NOT NULL,
    "occupancyRate" REAL NOT NULL,
    "utilityCost" INTEGER NOT NULL,
    "cleaningCost" INTEGER NOT NULL,
    "suppliesCost" INTEGER NOT NULL,
    "otaFeeRate" REAL NOT NULL DEFAULT 0.15,
    "otherCost" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimulationInput_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_source_sourceId_key" ON "Property"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationInput_propertyId_key" ON "SimulationInput"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_propertyId_key" ON "Favorite"("propertyId");
