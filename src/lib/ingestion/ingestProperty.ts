import { prisma } from "@/lib/prisma";
import { calculateMinpakuScore } from "@/lib/score";
import { getRegulationLevel } from "@/lib/regions";
import { fetchPublicDataForProperty } from "@/lib/publicData/enrichProperty";
import { unavailablePublicDataResult } from "@/lib/publicData/types";
import { findConfidentMatch, findDuplicateCandidates } from "@/lib/ingestion/duplicateDetection";
import { matchNewProperty } from "@/lib/notifications/matchSavedSearches";
import type { RawListingInput } from "@/lib/ingestion/types";

export interface IngestResult {
  propertyId: number;
  /** 新規作成された場合 true、既存物件を更新した場合 false */
  created: boolean;
  /** 自動統合はしていない「重複候補」として記録された件数（新規作成時のみ発生しうる） */
  duplicateCandidateCount: number;
}

/**
 * 正規化済みの物件データ(RawListingInput)を受け取り、
 *  1. 周辺観光地・競合件数・地域の民泊規制レベル・公的データ(国土交通省 不動産情報ライブラリ)
 *     から民泊適性スコアを算出
 *  2. Property・SimulationInput・NearbyAttraction・CompetitorListing・PublicDataSnapshot を
 *     DB に反映
 * するデータ取得レイヤーの本体。
 *
 * 手入力データ(prisma/seed.ts)・管理画面からの手動登録・CSVインポート・将来の外部データ取得
 * アダプタは、すべて必ずこの関数を通してDBに書き込む。これにより「データソースが増えても
 * スコアリング・検索画面には一切手を入れなくてよい」という構造を保つ。
 *
 * 重複判定（src/lib/ingestion/duplicateDetection.ts）:
 *  1. source + externalId の完全一致 → 更新
 *  2. 同一 sourceUrl → 更新
 *  3. 上記で判定できない場合は新規作成し、あいまい一致で見つかった類似物件があれば
 *     DuplicateCandidate として記録する（自動統合はしない）
 *
 * 掲載状態のライフサイクル:
 *  - raw.listingStatus 等が明示的に指定されていればそれを優先する（管理画面・CSVからの
 *    手動指定に対応）
 *  - 指定が無い場合、この関数が呼ばれる（＝その物件データが取得できた）こと自体を
 *    「ACTIVEとして確認できた」とみなし、lastSeenAt/lastCheckedAtを現在時刻に更新する。
 *    新規作成時のみ firstSeenAt も設定する
 *  - 「一定期間確認できない物件を自動でENDED/UNKNOWNにする」処理はこの関数の対象外。
 *    src/lib/ingestion/reconcileListingStatus.ts を参照
 *
 * 公的データの取得はベストエフォートであり、失敗しても本関数自体は失敗しない
 * （fetchPublicDataForProperty は例外を投げず、常に何らかの結果を返す設計）。
 */
export async function ingestProperty(raw: RawListingInput): Promise<IngestResult> {
  const nearbyAttractions = raw.nearbyAttractions ?? [];
  const competitors = raw.competitors ?? [];

  const nearestAttractionKm =
    nearbyAttractions.length > 0
      ? Math.min(...nearbyAttractions.map((a) => a.distanceKm))
      : null;
  const nearbyAttractionCount = nearbyAttractions.filter((a) => a.distanceKm <= 5).length;
  const competitorCount = competitors.filter((c) => c.distanceKm <= 2).length;
  const regulationLevel = getRegulationLevel(raw.city);

  // fetchPublicDataForProperty は例外を投げない設計だが、念のため二重に保護し、
  // 想定外のエラーが起きても物件の取り込み自体は絶対に止めない。
  const publicData = await fetchPublicDataForProperty({
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    city: raw.city,
  }).catch((error: unknown) => {
    console.warn("公的データの取得中に予期しないエラーが発生しました:", error);
    return unavailablePublicDataResult("公的データの取得中に予期しないエラーが発生しました。");
  });

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
    publicData: {
      areaAvgUnitPricePerSqm: publicData.areaAvgUnitPricePerSqm,
      useZone: publicData.useZone,
      stationDailyUsers: publicData.stationDailyUsers,
      floodRiskArea: publicData.floodRiskArea,
      tsunamiRiskArea: publicData.tsunamiRiskArea,
      landslideRiskArea: publicData.landslideRiskArea,
      stormSurgeRiskArea: publicData.stormSurgeRiskArea,
    },
  });

  // 宿泊単価が未指定の場合、家賃から簡易推定（ユーザーが後で自由に編集する前提の初期値）
  const nightlyPrice = raw.simulation?.nightlyPrice ?? Math.round(raw.rent / 6 / 100) * 100;

  const now = new Date();

  // --- 重複判定 ---
  const existing = await findConfidentMatch(raw);
  const duplicateCandidates = existing ? [] : await findDuplicateCandidates(raw);

  // --- 掲載状態のライフサイクル計算 ---
  const effectiveStatus = raw.listingStatus ?? "ACTIVE";
  const lastCheckedAt = raw.lastCheckedAt ?? now;
  // ACTIVEとして確認できた場合のみ lastSeenAt を更新する。
  // 明示的にENDED/UNKNOWNへ変更する場合は「見えなくなった」ことの確認なので、
  // 最後に実際に見えていた日時(lastSeenAt)は更新しない（既存値を維持）。
  const lastSeenAt =
    raw.lastSeenAt ?? (effectiveStatus === "ACTIVE" ? now : (existing?.lastSeenAt ?? now));

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
    // 未指定(undefined)の場合、Prismaはこのキーを「更新しない」ものとして扱うため、
    // 既存物件を再取込した際に確認済みの状態を意図せず未確認へ戻すことはない。
    // 新規作成時のみスキーマの既定値(UNKNOWN)が適用される。
    minpakuConsultationStatus: raw.minpakuConsultationStatus,
    latitude: raw.latitude,
    longitude: raw.longitude,
    source: raw.source,
    externalId: raw.externalId,
    sourceUrl: raw.sourceUrl,
    minpakuScore,
    listingStatus: effectiveStatus,
    lastSeenAt,
    lastCheckedAt,
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

  const result = await prisma.$transaction(async (tx) => {
    const property = existing
      ? await tx.property.update({ where: { id: existing.id }, data: baseData })
      : await tx.property.create({
          data: { ...baseData, firstSeenAt: raw.firstSeenAt ?? now },
        });

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

    await tx.publicDataSnapshot.upsert({
      where: { propertyId: property.id },
      create: { propertyId: property.id, ...publicData },
      update: { ...publicData, fetchedAt: new Date() },
    });

    if (!existing && duplicateCandidates.length > 0) {
      await tx.duplicateCandidate.createMany({
        data: duplicateCandidates.map((c) => ({
          propertyId: property.id,
          candidatePropertyId: c.property.id,
          reason: c.reason,
          similarity: c.similarity,
        })),
      });
    }

    return { propertyId: property.id, created: !existing };
  });

  // 新規作成（＝真の新着物件）の場合のみ、保存検索条件との照合を行う。
  // 既存物件の更新（家賃変更など）では新着通知を生成しない。
  // ベストエフォートの副次機能のため、失敗しても物件の取り込み自体は成功として扱う。
  if (result.created) {
    await matchNewProperty(result.propertyId).catch((error: unknown) => {
      console.warn("保存検索条件との照合中に予期しないエラーが発生しました:", error);
    });
  }

  return { ...result, duplicateCandidateCount: duplicateCandidates.length };
}
