-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
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
    "minpakuConsultationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "latitude" REAL,
    "longitude" REAL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "listingStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minpakuScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Property" ("address", "areaSqm", "buildingType", "builtYear", "city", "createdAt", "deposit", "externalId", "firstSeenAt", "hasParking", "id", "initialCost", "keyMoney", "lastCheckedAt", "lastSeenAt", "latitude", "layout", "listingStatus", "longitude", "managementFee", "memo", "minpakuScore", "name", "photoUrl", "prefecture", "rent", "source", "sourceUrl", "stationName", "stationWalkMin", "updatedAt") SELECT "address", "areaSqm", "buildingType", "builtYear", "city", "createdAt", "deposit", "externalId", "firstSeenAt", "hasParking", "id", "initialCost", "keyMoney", "lastCheckedAt", "lastSeenAt", "latitude", "layout", "listingStatus", "longitude", "managementFee", "memo", "minpakuScore", "name", "photoUrl", "prefecture", "rent", "source", "sourceUrl", "stationName", "stationWalkMin", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE UNIQUE INDEX "Property_source_externalId_key" ON "Property"("source", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
