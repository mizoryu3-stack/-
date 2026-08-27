import { prisma } from "@/lib/prisma";
import { calculateMinpakuScore } from "@/lib/score";
import { getRegulationLevel } from "@/lib/regions";
import type { RawListingInput } from "@/lib/ingestion/types";

/**
 * 正規化済みの物件データ(RawListingInput)を受け取り、
 *  1. 周辺観光地・競合件数・地域の民泊規制レベルから民泊適性スコアを算出
 *  2. Property・SimulationInput・NearbyAttraction・CompetitorListing を DB に反映
 * するデータ取得レイヤーの本体。
 *
 * 手入力データ(prisma/seed.ts)も将来の外部データ取得アダプタ（未実装）も、
 * 必ずこの関数を通してDBに書き込む。これにより「データソースが増えても
 * スコアリング・検索画面には一切手を入れなくてよい」という構造を保つ。
 *
 * source + sourceId が一致する既存物件があれば更新（再取得時の重複防止）、
 * なければ新規作成する。sourceId が無い手入力データは常に新規作成する。
 */
export async function ingestProperty(raw: RawListingInput) {
  const nearbyAttractions = raw.nearbyAttractions ?? [];
  const competitors = raw.competitors ?? [];

  const nearestAttractionKm =
    nearbyAttractions.length > 0
      ? Math.min(...nearbyAttractions.map((a) => a.distanceKm))
      : null;
  const nearbyAttractionCount = nearbyAttractions.filter((a) => a.distanceKm <= 5).length;
  const competitorCount = competitors.filter((c) => c.distanceKm <= 2).length;
  const regulationLevel = getRegulationLevel(raw.city);

  const { total: minpakuScore } = calculateMinpakuScore({
    rent: raw.rent,
    areaSqm: raw.areaSqm,
    stationWalkMin: raw.stationWalkMin,
    hasParking: raw.hasParking,
    buildingType: raw.buildingType,
    builtYear: raw.builtYear,
    nearestAttractionKm,
    nearbyAttractionCount,
    competitorCount,
    regulationLevel,
  });

  // 宿泊単価が未指定の場合、家賃から簡易推定（ユーザーが後で自由に編集する前提の初期値）
  const nightlyPrice = raw.simulation?.nightlyPrice ?? Math.round(raw.rent / 6 / 100) * 100;

  const baseData = {
    name: raw.name,
    prefecture: raw.prefecture,
    city: raw.city,
    address: raw.address,
    buildingType: raw.buildingType,
    rent: raw.rent,
    managementFee: raw.managementFee ?? 0,
    layout: raw.layout,
    areaSqm: raw.areaSqm,
    builtYear: raw.builtYear,
    stationName: raw.stationName,
    stationWalkMin: raw.stationWalkMin,
    hasParking: raw.hasParking,
    deposit: raw.deposit ?? 0,
    keyMoney: raw.keyMoney ?? 0,
    initialCost: raw.initialCost,
    photoUrl: raw.photoUrl,
    memo: raw.memo,
    source: raw.source,
    sourceId: raw.sourceId,
    sourceUrl: raw.sourceUrl,
    fetchedAt: raw.fetchedAt,
    minpakuScore,
  };

  const simulationData = {
    nightlyPrice,
    occupancyRate: raw.simulation?.occupancyRate ?? 0.5,
    utilityCost: raw.simulation?.utilityCost ?? 15_000,
    cleaningCost: raw.simulation?.cleaningCost ?? 20_000,
    suppliesCost: raw.simulation?.suppliesCost ?? 5_000,
    otaFeeRate: raw.simulation?.otaFeeRate ?? 0.15,
    otherCost: raw.simulation?.otherCost ?? 5_000,
  };

  const existing = raw.sourceId
    ? await prisma.property.findUnique({
        where: { source_sourceId: { source: raw.source, sourceId: raw.sourceId } },
      })
    : null;

  const propertyId = await prisma.$transaction(async (tx) => {
    const property = existing
      ? await tx.property.update({ where: { id: existing.id }, data: baseData })
      : await tx.property.create({ data: baseData });

    await tx.simulationInput.upsert({
      where: { propertyId: property.id },
      create: { propertyId: property.id, ...simulationData },
      update: simulationData,
    });

    // 観光地・競合情報は取込のたびに全件差し替える（重複防止・最新化のため）
    await tx.nearbyAttraction.deleteMany({ where: { propertyId: property.id } });
    if (nearbyAttractions.length > 0) {
      await tx.nearbyAttraction.createMany({
        data: nearbyAttractions.map((a) => ({ ...a, propertyId: property.id })),
      });
    }

    await tx.competitorListing.deleteMany({ where: { propertyId: property.id } });
    if (competitors.length > 0) {
      await tx.competitorListing.createMany({
        data: competitors.map((c) => ({ ...c, propertyId: property.id })),
      });
    }

    return property.id;
  });

  return propertyId;
}
