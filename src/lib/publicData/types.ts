/**
 * 国土交通省「不動産情報ライブラリ」から取得する公的データ関連の型定義。
 *
 * ⚠️ 重要：ここで扱うデータ（地価・用途地域・駅利用者数・災害リスク）は、
 * あくまで「物件周辺の環境・立地・リスクを評価するための参考データ」であり、
 * これだけで「民泊営業が可能／不可能」を断定するものではない。
 * 住宅宿泊事業法・旅館業法・自治体条例・マンション管理規約等の確認は別途必要。
 */
export const PUBLIC_DATA_DISCLAIMER =
  "地価・用途地域・駅利用者数・災害リスクは、国土交通省「不動産情報ライブラリ」等の公開データに基づく参考評価です。これらの情報だけで民泊営業の可否や安全性を保証・確定するものではありません。";

export type PublicDataFetchStatus = "OK" | "PARTIAL" | "UNAVAILABLE" | "SKIPPED";

/**
 * PublicDataSnapshot(DB)の中身に対応する、取得結果の型。
 * すべてのフィールドが取得失敗時にnullになりうる（部分的な失敗を許容する）。
 */
export interface PublicDataResult {
  fetchStatus: PublicDataFetchStatus;
  fetchNote: string | null;

  areaAvgUnitPricePerSqm: number | null;
  areaPriceYear: number | null;
  areaPriceQuarter: number | null;

  useZone: string | null;

  stationDailyUsers: number | null;
  stationUsageYear: number | null;

  floodRiskArea: boolean | null;
  tsunamiRiskArea: boolean | null;
  landslideRiskArea: boolean | null;
  stormSurgeRiskArea: boolean | null;
}

/** 何も取得を試みなかった場合（緯度経度未設定など）のデフォルト値 */
export function skippedPublicDataResult(note: string): PublicDataResult {
  return {
    fetchStatus: "SKIPPED",
    fetchNote: note,
    areaAvgUnitPricePerSqm: null,
    areaPriceYear: null,
    areaPriceQuarter: null,
    useZone: null,
    stationDailyUsers: null,
    stationUsageYear: null,
    floodRiskArea: null,
    tsunamiRiskArea: null,
    landslideRiskArea: null,
    stormSurgeRiskArea: null,
  };
}

/** 取得を試みたが全滅した場合のデフォルト値 */
export function unavailablePublicDataResult(note: string): PublicDataResult {
  return { ...skippedPublicDataResult(note), fetchStatus: "UNAVAILABLE" };
}
