import { prisma } from "@/lib/prisma";

/**
 * テスト間でDBを空の状態に戻す。外部キー制約の都合上、子テーブルから先に削除する。
 * 呼び出し側の各テストファイルで beforeEach(resetDb) として使う想定。
 */
export async function resetDb() {
  await prisma.propertyMatch.deleteMany();
  await prisma.duplicateCandidate.deleteMany();
  await prisma.competitorListing.deleteMany();
  await prisma.nearbyAttraction.deleteMany();
  await prisma.publicDataSnapshot.deleteMany();
  await prisma.simulationInput.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.property.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.searchRunSource.deleteMany();
  await prisma.searchRun.deleteMany();
}
