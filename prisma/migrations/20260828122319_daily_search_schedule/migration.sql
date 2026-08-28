-- CreateTable
CREATE TABLE "DailySearchSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT NOT NULL DEFAULT '08:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailySearchSchedule_userId_key" ON "DailySearchSchedule"("userId");
