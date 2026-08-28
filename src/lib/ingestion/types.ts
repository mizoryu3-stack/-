import type { BuildingTypeForScore } from "@/lib/score";

export type ListingStatusInput = "ACTIVE" | "ENDED" | "UNKNOWN";
export const VALID_LISTING_STATUSES: ListingStatusInput[] = ["ACTIVE", "ENDED", "UNKNOWN"];

/**
 * 外部物件データを取り込むための正規化済みデータ形式。
 *
 * どのデータソース（手入力・将来のSUUMO/HOME'S/アットホーム等のアダプタ）から来た
 * データであっても、必ずこの形式に変換してから ingestProperty() に渡す。
 * これにより DB・スコアリング・検索画面はデータソースの違いを一切意識しなくてよい。
 *
 *   物件データ(外部サイト等) → データ取得レイヤー(このファイル + ingestProperty.ts) → DB → 民泊分析 → 検索画面
 */
export interface RawListingInput {
  name: string;
  prefecture: string;
  city: string;
  address: string;
  buildingType: BuildingTypeForScore;
  rent: number;
  managementFee?: number;
  layout: string;
  areaSqm: number;
  builtYear: number;
  stationName?: string;
  stationWalkMin: number;
  hasParking: boolean;
  /** 緯度経度（任意）。設定すると国土交通省 不動産情報ライブラリ等の位置情報APIによる
   *  周辺環境の自動評価（PublicDataSnapshot）が有効になる。未設定の場合はスキップされる。 */
  latitude?: number;
  longitude?: number;
  deposit?: number;
  keyMoney?: number;
  initialCost?: number;
  photoUrl?: string;
  memo?: string;

  /** データソース識別子。"manual" | "suumo" | "homes" | "athome" など */
  source: string;
  /** 外部サイト側の物件ID（source + externalId が重複取込防止の基本キー）。手入力データは省略可。
   *  省略した場合、掲載状態の自動照合(reconcileListingStatus)の対象にはならない。 */
  externalId?: string;
  sourceUrl?: string;

  /**
   * 掲載状態のライフサイクルを手動で上書きしたい場合に指定する（管理画面からの手動登録・
   * CSVインポートでの「掲載終了」への変更など）。省略した場合は ingestProperty() 側の
   * 自動ロジック（取り込めた＝ACTIVE、lastSeenAt/lastCheckedAtを現在時刻に更新）に従う。
   */
  listingStatus?: ListingStatusInput;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  lastCheckedAt?: Date;

  /** 収益シミュレーションの初期値（省略時はrentから簡易推定） */
  simulation?: {
    nightlyPrice?: number;
    occupancyRate?: number;
    utilityCost?: number;
    cleaningCost?: number;
    suppliesCost?: number;
    otaFeeRate?: number;
    otherCost?: number;
  };

  /** 周辺観光地（民泊分析・スコアリングに使用） */
  nearbyAttractions?: { name: string; distanceKm: number }[];
  /** 周辺競合民泊（民泊分析・スコアリングに使用） */
  competitors?: { platform?: string; distanceKm: number }[];
}

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_BUILDING_TYPES: BuildingTypeForScore[] = ["HOUSE", "APARTMENT"];

/**
 * RawListingInput の最低限のバリデーション。
 * 外部API(src/app/api/properties/ingest)経由で受け取ったJSONもここを必ず通す。
 */
export function validateRawListing(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input !== "object" || input === null) {
    return [{ field: "root", message: "オブジェクトである必要があります" }];
  }
  const r = input as Record<string, unknown>;

  const requiredStrings: (keyof RawListingInput)[] = [
    "name",
    "prefecture",
    "city",
    "address",
    "layout",
    "source",
  ];
  for (const field of requiredStrings) {
    if (typeof r[field] !== "string" || (r[field] as string).trim() === "") {
      errors.push({ field, message: "必須の文字列フィールドです" });
    }
  }

  if (!VALID_BUILDING_TYPES.includes(r.buildingType as BuildingTypeForScore)) {
    errors.push({ field: "buildingType", message: "HOUSE または APARTMENT である必要があります" });
  }

  const requiredNumbers: (keyof RawListingInput)[] = ["rent", "areaSqm", "builtYear", "stationWalkMin"];
  for (const field of requiredNumbers) {
    if (typeof r[field] !== "number" || Number.isNaN(r[field])) {
      errors.push({ field, message: "必須の数値フィールドです" });
    }
  }

  if (typeof r.hasParking !== "boolean") {
    errors.push({ field: "hasParking", message: "真偽値である必要があります" });
  }

  if (r.latitude !== undefined && (typeof r.latitude !== "number" || r.latitude < -90 || r.latitude > 90)) {
    errors.push({ field: "latitude", message: "-90〜90の数値である必要があります" });
  }
  if (r.longitude !== undefined && (typeof r.longitude !== "number" || r.longitude < -180 || r.longitude > 180)) {
    errors.push({ field: "longitude", message: "-180〜180の数値である必要があります" });
  }

  if (
    r.listingStatus !== undefined &&
    !VALID_LISTING_STATUSES.includes(r.listingStatus as ListingStatusInput)
  ) {
    errors.push({ field: "listingStatus", message: "ACTIVE / ENDED / UNKNOWN のいずれかである必要があります" });
  }

  return errors;
}
