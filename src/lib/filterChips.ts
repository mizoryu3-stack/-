import { buildingTypeLabel } from "@/lib/format";
import type { SearchFilters } from "@/lib/types";

export interface FilterChip {
  key: string;
  label: string;
}

/**
 * 現在有効な検索条件を「一目で分かる」チップのラベルに変換する。
 * sort は絞り込み条件ではないため対象外。
 */
export function describeFilters(filters: SearchFilters): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.city) chips.push({ key: "city", label: `📍 ${filters.city}` });
  if (filters.buildingType) {
    chips.push({ key: "buildingType", label: buildingTypeLabel[filters.buildingType] });
  }
  if (filters.layout) chips.push({ key: "layout", label: `間取り: ${filters.layout}` });
  if (filters.rentMax !== undefined) {
    chips.push({ key: "rentMax", label: `家賃 ${Math.round(filters.rentMax / 10_000)}万円以下` });
  }
  if (filters.areaSqmMin !== undefined) {
    chips.push({ key: "areaSqmMin", label: `専有面積 ${filters.areaSqmMin}m²以上` });
  }
  if (filters.maxAge !== undefined) {
    chips.push({ key: "maxAge", label: `築${filters.maxAge}年以内` });
  }
  if (filters.stationWalkMax !== undefined) {
    chips.push({ key: "stationWalkMax", label: `駅徒歩${filters.stationWalkMax}分以内` });
  }
  if (filters.hasParking !== undefined) {
    chips.push({ key: "hasParking", label: `駐車場${filters.hasParking ? "あり" : "なし"}` });
  }
  if (filters.depositMax !== undefined) {
    chips.push({ key: "depositMax", label: `敷金 ${Math.round(filters.depositMax / 10_000)}万円以下` });
  }
  if (filters.keyMoneyMax !== undefined) {
    chips.push({ key: "keyMoneyMax", label: `礼金 ${Math.round(filters.keyMoneyMax / 10_000)}万円以下` });
  }

  return chips;
}

/** 現在のクエリパラメータから指定キーを除いたクエリ文字列を作る（チップの削除リンク用） */
export function buildRemoveParamHref(
  rawParams: Record<string, string | string[] | undefined>,
  keyToRemove: string,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === keyToRemove || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
