import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { calculateMinpakuScore } from "../src/lib/score";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

interface SeedProperty {
  name: string;
  area: string;
  address: string;
  buildingType: "HOUSE" | "APARTMENT";
  rent: number;
  managementFee: number;
  layout: string;
  areaSqm: number;
  builtYear: number;
  stationName: string;
  stationWalkMin: number;
  hasParking: boolean;
  deposit: number;
  keyMoney: number;
  initialCost: number;
  memo: string;
}

const properties: SeedProperty[] = [
  {
    name: "浅草シティハイツ",
    area: "台東区",
    address: "東京都台東区浅草1-2-3",
    buildingType: "APARTMENT",
    rent: 130_000,
    managementFee: 8_000,
    layout: "1LDK",
    areaSqm: 38.5,
    builtYear: 2015,
    stationName: "浅草駅",
    stationWalkMin: 5,
    hasParking: false,
    deposit: 130_000,
    keyMoney: 130_000,
    initialCost: 450_000,
    memo: "浅草寺まで徒歩10分。インバウンド需要が見込めるエリア。",
  },
  {
    name: "京都西陣コーポ",
    area: "京都市上京区",
    address: "京都府京都市上京区西陣町4-5",
    buildingType: "HOUSE",
    rent: 95_000,
    managementFee: 0,
    layout: "3DK",
    areaSqm: 65.0,
    builtYear: 1998,
    stationName: "今出川駅",
    stationWalkMin: 12,
    hasParking: true,
    deposit: 95_000,
    keyMoney: 0,
    initialCost: 300_000,
    memo: "京町家風。庭付き戸建てで駐車場あり。",
  },
  {
    name: "大阪なんばレジデンス",
    area: "大阪市中央区",
    address: "大阪府大阪市中央区難波5-6-7",
    buildingType: "APARTMENT",
    rent: 145_000,
    managementFee: 10_000,
    layout: "1K",
    areaSqm: 28.0,
    builtYear: 2019,
    stationName: "なんば駅",
    stationWalkMin: 3,
    hasParking: false,
    deposit: 145_000,
    keyMoney: 145_000,
    initialCost: 500_000,
    memo: "繁華街に近く夜間の集客に強い立地。",
  },
  {
    name: "軽井沢フォレストコテージ",
    area: "軽井沢町",
    address: "長野県北佐久郡軽井沢町長倉8-9",
    buildingType: "HOUSE",
    rent: 80_000,
    managementFee: 0,
    layout: "4LDK",
    areaSqm: 110.0,
    builtYear: 2005,
    stationName: "軽井沢駅",
    stationWalkMin: 25,
    hasParking: true,
    deposit: 80_000,
    keyMoney: 80_000,
    initialCost: 350_000,
    memo: "リゾート地。車での来訪が前提のため駐車場は必須。",
  },
  {
    name: "札幌すすきのフラッツ",
    area: "札幌市中央区",
    address: "北海道札幌市中央区南5条西3-1",
    buildingType: "APARTMENT",
    rent: 78_000,
    managementFee: 5_000,
    layout: "1LDK",
    areaSqm: 35.0,
    builtYear: 2012,
    stationName: "すすきの駅",
    stationWalkMin: 4,
    hasParking: false,
    deposit: 78_000,
    keyMoney: 0,
    initialCost: 280_000,
    memo: "歓楽街近くで夜遅い到着の宿泊客にも対応しやすい。",
  },
  {
    name: "福岡博多駅前タワー",
    area: "福岡市博多区",
    address: "福岡県福岡市博多区博多駅前2-3-4",
    buildingType: "APARTMENT",
    rent: 118_000,
    managementFee: 7_000,
    layout: "1LDK",
    areaSqm: 40.0,
    builtYear: 2020,
    stationName: "博多駅",
    stationWalkMin: 6,
    hasParking: false,
    deposit: 118_000,
    keyMoney: 118_000,
    initialCost: 420_000,
    memo: "新幹線アクセス良好。ビジネス・観光双方の需要。",
  },
  {
    name: "熱海オーシャンヴィラ",
    area: "熱海市",
    address: "静岡県熱海市咲見町10-1",
    buildingType: "HOUSE",
    rent: 70_000,
    managementFee: 0,
    layout: "3LDK",
    areaSqm: 85.0,
    builtYear: 1992,
    stationName: "熱海駅",
    stationWalkMin: 18,
    hasParking: true,
    deposit: 70_000,
    keyMoney: 70_000,
    initialCost: 260_000,
    memo: "海が見える高台の戸建て。温泉旅行需要が見込める。",
  },
  {
    name: "沖縄那覇国際通りコンドミニアム",
    area: "那覇市",
    address: "沖縄県那覇市牧志1-2-3",
    buildingType: "APARTMENT",
    rent: 105_000,
    managementFee: 6_000,
    layout: "2LDK",
    areaSqm: 55.0,
    builtYear: 2017,
    stationName: "牧志駅",
    stationWalkMin: 7,
    hasParking: false,
    deposit: 105_000,
    keyMoney: 105_000,
    initialCost: 380_000,
    memo: "国際通りまで徒歩圏内。海外観光客からの人気が高いエリア。",
  },
  {
    name: "名古屋栄ステイハウス",
    area: "名古屋市中区",
    address: "愛知県名古屋市中区栄3-4-5",
    buildingType: "APARTMENT",
    rent: 98_000,
    managementFee: 6_000,
    layout: "1K",
    areaSqm: 25.0,
    builtYear: 2008,
    stationName: "栄駅",
    stationWalkMin: 9,
    hasParking: false,
    deposit: 98_000,
    keyMoney: 0,
    initialCost: 300_000,
    memo: "築年数はやや経過しているが立地は良好。",
  },
  {
    name: "金沢ひがし茶屋町の宿",
    area: "金沢市",
    address: "石川県金沢市東山1-6-7",
    buildingType: "HOUSE",
    rent: 60_000,
    managementFee: 0,
    layout: "2DK",
    areaSqm: 50.0,
    builtYear: 1985,
    stationName: "金沢駅",
    stationWalkMin: 22,
    hasParking: true,
    deposit: 60_000,
    keyMoney: 0,
    initialCost: 220_000,
    memo: "ひがし茶屋街近く。古民家風で外国人観光客に人気の内装にしやすい。",
  },
];

async function main() {
  console.log("Seeding database...");

  // 既存データをクリアしてから投入（プロトタイプ用の簡易シード）
  await prisma.favorite.deleteMany();
  await prisma.simulationInput.deleteMany();
  await prisma.property.deleteMany();

  for (const p of properties) {
    const { total: minpakuScore } = calculateMinpakuScore({
      rent: p.rent,
      areaSqm: p.areaSqm,
      stationWalkMin: p.stationWalkMin,
      hasParking: p.hasParking,
      buildingType: p.buildingType,
      builtYear: p.builtYear,
    });

    // 宿泊単価はざっくり「家賃 / 6」を初期値の目安として設定（ユーザーが後で自由に編集する前提）
    const nightlyPrice = Math.round((p.rent / 6) / 100) * 100;

    await prisma.property.create({
      data: {
        ...p,
        minpakuScore,
        simulationInput: {
          create: {
            nightlyPrice,
            occupancyRate: 0.5,
            utilityCost: 15_000,
            cleaningCost: 20_000,
            suppliesCost: 5_000,
            otherCost: 5_000,
          },
        },
      },
    });
  }

  console.log(`Seeded ${properties.length} properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
