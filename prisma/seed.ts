import { prisma } from "../src/lib/prisma";
import { getManualListings } from "../src/lib/ingestion/sources/manual";
import { ingestProperty } from "../src/lib/ingestion/ingestProperty";

// このスクリプトは「データ取得レイヤー」(src/lib/ingestion) を通してDBに
// データを投入するだけの薄いエントリーポイント。実データを取り込む場合も
// sources/ に新しいアダプタを追加し、ここで呼び出すだけでよい。

async function main() {
  console.log("Seeding database...");

  await prisma.favorite.deleteMany();
  await prisma.competitorListing.deleteMany();
  await prisma.nearbyAttraction.deleteMany();
  await prisma.simulationInput.deleteMany();
  await prisma.property.deleteMany();

  const listings = getManualListings();
  for (const listing of listings) {
    await ingestProperty(listing);
  }

  console.log(`Seeded ${listings.length} properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
