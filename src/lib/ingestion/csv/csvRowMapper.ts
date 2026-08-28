import { SUPPORTED_AREAS, SUPPORTED_PREFECTURE } from "@/lib/regions";
import type { RawListingInput, ListingStatusInput } from "@/lib/ingestion/types";
import type { CanonicalField } from "@/lib/ingestion/csv/columnAliases";

export interface RowConversionResult {
  ok: boolean;
  data?: RawListingInput;
  errors: string[];
}

const BUILDING_TYPE_MAP: Record<string, "HOUSE" | "APARTMENT"> = {
  house: "HOUSE",
  戸建て: "HOUSE",
  戸建: "HOUSE",
  一戸建て: "HOUSE",
  apartment: "APARTMENT",
  マンション: "APARTMENT",
  アパート: "APARTMENT",
};

const LISTING_STATUS_MAP: Record<string, ListingStatusInput> = {
  active: "ACTIVE",
  掲載中: "ACTIVE",
  ended: "ENDED",
  掲載終了: "ENDED",
  終了: "ENDED",
  unknown: "UNKNOWN",
  確認できません: "UNKNOWN",
  不明: "UNKNOWN",
};

const PARKING_TRUE_VALUES = new Set(["true", "1", "yes", "y", "あり", "有", "○", "o"]);
const PARKING_FALSE_VALUES = new Set(["false", "0", "no", "n", "なし", "無", "×", "x", ""]);

function normalize(value: string): string {
  return value.normalize("NFKC").trim();
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || normalize(value) === "") return undefined;
  const n = Number(normalize(value));
  return Number.isFinite(n) ? n : NaN;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** 住所文字列から、対応エリア（src/lib/regions.ts）の市区町村名を推定する */
function guessCityFromAddress(address: string): string | undefined {
  const normalized = normalize(address);
  // より長い（≒より具体的な）市区町村名から先に照合する（例:「広島市」より先に「広島市中区」を試す）
  const sorted = [...SUPPORTED_AREAS].sort((a, b) => b.city.length - a.city.length);
  return sorted.find((area) => normalized.includes(area.city))?.city;
}

/**
 * CSVの1行分の値（正規化フィールド名 → セルの文字列）を RawListingInput に変換する。
 * STEP3で要求されているバリデーション（数値・緯度経度・必須項目・enum・URL）をここで行う。
 */
export function convertCsvRow(cells: Partial<Record<CanonicalField, string>>): RowConversionResult {
  const errors: string[] = [];
  // 列自体が無い場合(undefined)と、列はあるが値が空文字列の場合を同じ「未入力」として扱う。
  const get = (field: CanonicalField) => {
    const v = cells[field];
    if (v === undefined) return undefined;
    const normalized = normalize(v);
    return normalized === "" ? undefined : normalized;
  };

  const name = get("name");
  if (!name) errors.push("物件名が必要です");

  const address = get("address");
  if (!address) errors.push("住所が必要です");

  const layout = get("layout");
  if (!layout) errors.push("間取りが必要です");

  const rentRaw = get("rent");
  const rent = parseOptionalNumber(rentRaw);
  if (rentRaw === undefined || rentRaw === "") errors.push("家賃が必要です");
  else if (rent === undefined || Number.isNaN(rent) || rent <= 0) errors.push("家賃が不正です（数値で入力してください）");

  const areaRaw = get("areaSqm");
  const areaSqm = parseOptionalNumber(areaRaw);
  if (areaRaw === undefined || areaRaw === "") errors.push("専有面積が必要です");
  else if (areaSqm === undefined || Number.isNaN(areaSqm) || areaSqm <= 0)
    errors.push("専有面積が不正です（数値で入力してください）");

  const stationWalkRaw = get("stationWalkMin");
  const stationWalkMin = parseOptionalNumber(stationWalkRaw);
  if (stationWalkRaw === undefined || stationWalkRaw === "") errors.push("駅徒歩が必要です");
  else if (stationWalkMin === undefined || Number.isNaN(stationWalkMin) || stationWalkMin < 0)
    errors.push("駅徒歩が不正です（0以上の数値で入力してください）");

  // 築年数(buildingAge) または 築年(builtYear) のどちらか一方が必要
  const currentYear = new Date().getFullYear();
  const buildingAgeRaw = get("buildingAge");
  const builtYearRaw = get("builtYear");
  let builtYear: number | undefined;
  if (builtYearRaw) {
    const y = parseOptionalNumber(builtYearRaw);
    if (y === undefined || Number.isNaN(y) || y < 1900 || y > currentYear) {
      errors.push("築年が不正です");
    } else {
      builtYear = y;
    }
  } else if (buildingAgeRaw) {
    const age = parseOptionalNumber(buildingAgeRaw);
    if (age === undefined || Number.isNaN(age) || age < 0 || age > 150) {
      errors.push("築年数が不正です");
    } else {
      builtYear = currentYear - age;
    }
  } else {
    errors.push("築年数または築年のいずれかが必要です");
  }

  const buildingTypeRaw = get("buildingType");
  let buildingType: "HOUSE" | "APARTMENT" | undefined;
  if (!buildingTypeRaw) {
    errors.push("物件種別が必要です");
  } else {
    buildingType = BUILDING_TYPE_MAP[buildingTypeRaw.toLowerCase()] ?? BUILDING_TYPE_MAP[buildingTypeRaw];
    if (!buildingType) errors.push("物件種別が不正です（戸建て/マンション のいずれかを指定してください）");
  }

  const latitudeRaw = get("latitude");
  const latitude = parseOptionalNumber(latitudeRaw);
  if (latitudeRaw !== undefined && (latitude === undefined || Number.isNaN(latitude) || latitude < -90 || latitude > 90)) {
    errors.push("緯度が不正です（-90〜90の数値で入力してください）");
  }

  const longitudeRaw = get("longitude");
  const longitude = parseOptionalNumber(longitudeRaw);
  if (
    longitudeRaw !== undefined &&
    (longitude === undefined || Number.isNaN(longitude) || longitude < -180 || longitude > 180)
  ) {
    errors.push("経度が不正です（-180〜180の数値で入力してください）");
  }

  const listingStatusRaw = get("listingStatus");
  let listingStatus: ListingStatusInput | undefined;
  if (listingStatusRaw) {
    listingStatus = LISTING_STATUS_MAP[listingStatusRaw.toLowerCase()] ?? LISTING_STATUS_MAP[listingStatusRaw];
    if (!listingStatus) errors.push("掲載状態が不正です（ACTIVE/ENDED/UNKNOWN のいずれかを指定してください）");
  }

  const sourceUrl = get("sourceUrl");
  if (sourceUrl && !isValidUrl(sourceUrl)) errors.push("元サイトURLが不正です");

  const photoUrl = get("photoUrl");
  if (photoUrl && !isValidUrl(photoUrl)) errors.push("写真URLが不正です");

  let city = get("city");
  const prefecture = get("prefecture") ?? SUPPORTED_PREFECTURE;
  if (!city && address) {
    city = guessCityFromAddress(address);
    if (!city) errors.push("住所から市区町村を特定できませんでした（city列を指定してください）");
  }

  const managementFee = parseOptionalNumber(get("managementFee"));
  if (managementFee !== undefined && Number.isNaN(managementFee)) errors.push("管理費が不正です");
  const deposit = parseOptionalNumber(get("deposit"));
  if (deposit !== undefined && Number.isNaN(deposit)) errors.push("敷金が不正です");
  const keyMoney = parseOptionalNumber(get("keyMoney"));
  if (keyMoney !== undefined && Number.isNaN(keyMoney)) errors.push("礼金が不正です");
  const initialCost = parseOptionalNumber(get("initialCost"));
  if (initialCost !== undefined && Number.isNaN(initialCost)) errors.push("初期費用が不正です");

  const hasParkingRaw = get("hasParking")?.toLowerCase() ?? "";
  let hasParking = false;
  if (PARKING_TRUE_VALUES.has(hasParkingRaw)) hasParking = true;
  else if (PARKING_FALSE_VALUES.has(hasParkingRaw)) hasParking = false;
  else errors.push("駐車場の値が不正です（あり/なし 等で入力してください）");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    data: {
      name: name!,
      prefecture,
      city: city!,
      address: address!,
      buildingType: buildingType!,
      rent: rent!,
      managementFee,
      layout: layout!,
      areaSqm: areaSqm!,
      builtYear: builtYear!,
      stationName: get("stationName"),
      stationWalkMin: stationWalkMin!,
      hasParking,
      latitude,
      longitude,
      deposit,
      keyMoney,
      initialCost,
      photoUrl,
      memo: get("memo"),
      source: get("source") || "csv",
      externalId: get("externalId"),
      sourceUrl,
      listingStatus,
    },
  };
}
