import type { RawListingInput } from "@/lib/ingestion/types";

let counter = 0;

/**
 * テスト用の RawListingInput を生成する。呉市（regions.ts の対応エリア）を既定値とし、
 * 緯度経度は指定しない（=公的データ取得はSKIPPEDになり、ネットワーク呼び出しを行わない）。
 */
export function makeRawListing(overrides: Partial<RawListingInput> = {}): RawListingInput {
  counter++;
  return {
    name: `テスト物件${counter}`,
    prefecture: "広島県",
    city: "呉市",
    address: `広島県呉市中央${counter}-${counter}-${counter}`,
    buildingType: "APARTMENT",
    rent: 60_000,
    layout: "1K",
    areaSqm: 25,
    builtYear: 2010,
    stationWalkMin: 5,
    hasParking: false,
    source: "test",
    ...overrides,
  };
}
