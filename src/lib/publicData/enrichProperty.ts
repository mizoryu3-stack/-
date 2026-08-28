/**
 * 物件の緯度経度・市区町村から、国土交通省「不動産情報ライブラリ」の公的データを
 * 取得して PublicDataResult にまとめる、エンリッチメント層の本体。
 *
 * 設計方針（すべて必須要件）:
 *  - APIキー未設定・緯度経度未設定の場合はネットワーク要求を一切行わず即座に返す
 *  - 各APIは Promise.allSettled で並行に呼び出し、一部が失敗しても他の項目は活かす
 *  - どのような失敗が起きても例外を投げない（呼び出し元のingestを絶対に落とさない）
 *
 * ⚠️ GIS系API（用途地域・駅・災害リスク）は緯度経度をXYZタイル座標に変換して取得するため、
 * 「タイル内に該当するポリゴン/地点が1件でもあるか」という簡易判定を行っている。
 * 点と多角形の厳密な内外判定（point-in-polygon）は行っていない。ズームレベルを高くする
 * （タイルを狭くする）ことである程度の精度は確保しているが、あくまで参考値である。
 */
import { getMunicipalityCode } from "@/lib/regions";
import { latLngToTile } from "@/lib/publicData/tiles";
import {
  fetchTileFeatures,
  fetchTransactionPrices,
  getReinfolibApiKey,
} from "@/lib/publicData/reinfolibClient";
import {
  skippedPublicDataResult,
  unavailablePublicDataResult,
  type PublicDataResult,
} from "@/lib/publicData/types";

const USE_ZONE_ZOOM = 15; // XKT002の有効範囲(11-15)のうち最も精度が高いレベル
const STATION_ZOOM = 14;
const HAZARD_ZOOM = 15; // 洪水等の有効範囲(14-15)のうち最も精度が高いレベル

const STATION_USAGE_FIELD = "S12_057"; // 2023年度の乗降客数（マニュアル確認時点の最新データ）
const STATION_USAGE_YEAR = 2023;

interface EnrichInput {
  latitude: number | null;
  longitude: number | null;
  city: string;
}

/** 直近で公表されている可能性が高い四半期を概算する（実績データは数ヶ月遅れで公表されるため） */
function computeRecentQuarter(monthsLag = 6): { year: number; quarter: number } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsLag, 1);
  const quarter = Math.floor(target.getMonth() / 3) + 1;
  return { year: target.getFullYear(), quarter };
}

function firstFeatureProperty(
  result: { ok: boolean; data?: { features: { properties: Record<string, unknown> }[] } },
  key: string,
): unknown {
  if (!result.ok || !result.data) return undefined;
  return result.data.features[0]?.properties[key];
}

function hasAnyFeature(result: { ok: boolean; data?: { features: unknown[] } }): boolean | null {
  if (!result.ok || !result.data) return null;
  return result.data.features.length > 0;
}

export async function fetchPublicDataForProperty(input: EnrichInput): Promise<PublicDataResult> {
  if (!getReinfolibApiKey()) {
    return unavailablePublicDataResult(
      "国土交通省 不動産情報ライブラリのAPIキー（REINFOLIB_API_KEY）が未設定のため、公的データを取得できませんでした。",
    );
  }

  if (input.latitude === null || input.longitude === null) {
    return skippedPublicDataResult(
      "物件に緯度経度が設定されていないため、公的データの取得を行っていません。",
    );
  }

  const { latitude, longitude, city } = input;
  const cityCode = getMunicipalityCode(city);
  const { year: priceYear, quarter: priceQuarter } = computeRecentQuarter();
  const useZoneTile = latLngToTile(latitude, longitude, USE_ZONE_ZOOM);
  const stationTile = latLngToTile(latitude, longitude, STATION_ZOOM);
  const hazardTile = latLngToTile(latitude, longitude, HAZARD_ZOOM);

  // 市区町村コードが regions.ts に無い場合、取引価格情報は最初から取得を試みない
  // （APIの失敗ではなく「対応表未整備」のため、ステータス集計にも含めない）。
  const priceRequest = cityCode ? fetchTransactionPrices(cityCode, priceYear, priceQuarter) : null;

  const [priceRes, useZoneRes, stationRes, floodRes, tsunamiRes, landslideRes, stormSurgeRes] =
    await Promise.allSettled([
      priceRequest ?? Promise.resolve(null),
      fetchTileFeatures("XKT002", useZoneTile.z, useZoneTile.x, useZoneTile.y),
      fetchTileFeatures("XKT015", stationTile.z, stationTile.x, stationTile.y),
      fetchTileFeatures("XKT026", hazardTile.z, hazardTile.x, hazardTile.y),
      fetchTileFeatures("XKT028", hazardTile.z, hazardTile.x, hazardTile.y),
      fetchTileFeatures("XKT029", hazardTile.z, hazardTile.x, hazardTile.y),
      fetchTileFeatures("XKT027", hazardTile.z, hazardTile.x, hazardTile.y),
    ]);

  // Promise.allSettled は基本的に上記の各関数が例外を投げない限りrejectedにならないが、
  // 万が一のため fulfilled 以外は「失敗」として扱う。
  const networkErrorFallback = { ok: false as const, reason: "NETWORK_ERROR" as const };
  const price = priceRes.status === "fulfilled" ? priceRes.value : networkErrorFallback;
  const useZone = useZoneRes.status === "fulfilled" ? useZoneRes.value : networkErrorFallback;
  const station = stationRes.status === "fulfilled" ? stationRes.value : networkErrorFallback;
  const flood = floodRes.status === "fulfilled" ? floodRes.value : networkErrorFallback;
  const tsunami = tsunamiRes.status === "fulfilled" ? tsunamiRes.value : networkErrorFallback;
  const landslide = landslideRes.status === "fulfilled" ? landslideRes.value : networkErrorFallback;
  const stormSurge = stormSurgeRes.status === "fulfilled" ? stormSurgeRes.value : networkErrorFallback;

  // 取引価格情報：平方メートル単価(UnitPrice)の単純平均
  // price は「市区町村コード未整備のため未実施(null)」「取得失敗」「取得成功」の3状態を取りうる
  let areaAvgUnitPricePerSqm: number | null = null;
  if (price && price.ok && Array.isArray(price.data)) {
    const unitPrices = price.data
      .map((r) => Number(r.UnitPrice))
      .filter((n): n is number => Number.isFinite(n) && n > 0);
    if (unitPrices.length > 0) {
      areaAvgUnitPricePerSqm = Math.round(unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length);
    }
  }

  const useZoneValue = firstFeatureProperty(useZone, "use_area_ja");
  const stationUsageRaw = firstFeatureProperty(station, STATION_USAGE_FIELD);
  const stationDailyUsers =
    typeof stationUsageRaw === "number"
      ? stationUsageRaw
      : typeof stationUsageRaw === "string" && Number.isFinite(Number(stationUsageRaw))
        ? Number(stationUsageRaw)
        : null;

  // price === null（市区町村コード未整備）は「試みていない」ため成功/失敗の集計から除外する
  const attemptedResults = [useZone, station, flood, tsunami, landslide, stormSurge, ...(price ? [price] : [])];
  const succeededCount = attemptedResults.filter((r) => r.ok).length;
  const fetchStatus =
    succeededCount === attemptedResults.length ? "OK" : succeededCount > 0 ? "PARTIAL" : "UNAVAILABLE";
  const fetchNote =
    fetchStatus === "OK"
      ? null
      : fetchStatus === "PARTIAL"
        ? "一部の公的データを取得できませんでした（通信エラーまたは対象地域のデータなし）。"
        : "公的データを取得できませんでした（通信エラーまたは対象地域のデータなし）。";

  return {
    fetchStatus,
    fetchNote,
    areaAvgUnitPricePerSqm,
    areaPriceYear: areaAvgUnitPricePerSqm !== null ? priceYear : null,
    areaPriceQuarter: areaAvgUnitPricePerSqm !== null ? priceQuarter : null,
    useZone: typeof useZoneValue === "string" ? useZoneValue : null,
    stationDailyUsers,
    stationUsageYear: stationDailyUsers !== null ? STATION_USAGE_YEAR : null,
    floodRiskArea: hasAnyFeature(flood),
    tsunamiRiskArea: hasAnyFeature(tsunami),
    landslideRiskArea: hasAnyFeature(landslide),
    stormSurgeRiskArea: hasAnyFeature(stormSurge),
  };
}
