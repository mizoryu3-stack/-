/**
 * CSVの列名は英語・日本語のどちらでも受け付ける。
 * ここに列挙したいずれかの見出し（大文字小文字を区別しない）が一致すれば、
 * 対応する正規化されたフィールドとして扱う。
 */
export const CANONICAL_FIELDS = [
  "name",
  "prefecture",
  "city",
  "address",
  "latitude",
  "longitude",
  "rent",
  "managementFee",
  "deposit",
  "keyMoney",
  "layout",
  "areaSqm",
  "buildingAge",
  "builtYear",
  "buildingType",
  "stationName",
  "stationWalkMin",
  "hasParking",
  "photoUrl",
  "sourceUrl",
  "source",
  "externalId",
  "listingStatus",
  "initialCost",
  "memo",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

const ALIASES: Record<CanonicalField, string[]> = {
  name: ["name", "propertyName", "物件名"],
  prefecture: ["prefecture", "都道府県"],
  city: ["city", "市区町村"],
  address: ["address", "住所"],
  latitude: ["latitude", "lat", "緯度"],
  longitude: ["longitude", "lng", "lon", "経度"],
  rent: ["rent", "家賃"],
  managementFee: ["managementFee", "管理費"],
  deposit: ["deposit", "敷金"],
  keyMoney: ["keyMoney", "礼金"],
  layout: ["layout", "間取り"],
  areaSqm: ["area", "areaSqm", "専有面積", "面積"],
  buildingAge: ["buildingAge", "築年数"],
  builtYear: ["builtYear", "築年"],
  buildingType: ["propertyType", "buildingType", "物件種別", "種別"],
  stationName: ["stationName", "最寄駅", "駅名"],
  stationWalkMin: ["stationWalkMinutes", "stationWalkMin", "駅徒歩"],
  hasParking: ["parking", "hasParking", "駐車場"],
  photoUrl: ["imageUrl", "photoUrl", "写真URL", "画像URL"],
  sourceUrl: ["sourceUrl", "元サイトURL", "URL", "url"],
  source: ["source", "取得元"],
  externalId: ["externalId", "外部ID", "外部サイトID"],
  listingStatus: ["listingStatus", "掲載状態"],
  initialCost: ["initialCost", "初期費用"],
  memo: ["memo", "メモ"],
};

function normalizeHeader(header: string): string {
  return header.normalize("NFKC").trim().toLowerCase();
}

/** ヘッダー行から「正規化フィールド名 → 列インデックス」の対応表を作る */
export function mapHeaders(headers: string[]): Partial<Record<CanonicalField, number>> {
  const normalizedToField = new Map<string, CanonicalField>();
  for (const field of CANONICAL_FIELDS) {
    for (const alias of ALIASES[field]) {
      normalizedToField.set(normalizeHeader(alias), field);
    }
  }

  const result: Partial<Record<CanonicalField, number>> = {};
  headers.forEach((header, index) => {
    const field = normalizedToField.get(normalizeHeader(header));
    if (field && result[field] === undefined) {
      result[field] = index;
    }
  });
  return result;
}
