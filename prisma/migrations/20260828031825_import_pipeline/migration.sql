-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propertyId" INTEGER NOT NULL,
    "candidatePropertyId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "similarity" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DuplicateCandidate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuplicateCandidate_candidatePropertyId_fkey" FOREIGN KEY ("candidatePropertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRows" INTEGER NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "duplicateCandidateCount" INTEGER NOT NULL,
    "errorsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
