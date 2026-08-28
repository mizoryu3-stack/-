import type { Prisma } from "@/generated/prisma/client";

/**
 * 物件を絞り込むための条件。検索画面(SearchFilters)と保存検索条件(SavedSearch)の
 * 両方から使われる共通の形。search画面のUIに存在する項目のうち、SavedSearchが
 * 対応する範囲（region/maxRent/propertyType/minArea/maxBuildingAge/
 * maxStationWalkMinutes/parkingRequired に相当）をカバーする。
 */
export interface PropertyQueryCriteria {
  city?: string;
  rentMax?: number;
  buildingType?: "HOUSE" | "APARTMENT";
  layout?: string;
  areaSqmMin?: number;
  maxAge?: number;
  stationWalkMax?: number;
  hasParking?: boolean;
  depositMax?: number;
  keyMoneyMax?: number;
}

/**
 * 検索画面の絞り込みと、新着物件が保存検索条件に一致するかどうかの判定の両方で使う、
 * 唯一のwhere生成ロジック。ここを直せば両方に反映される。
 */
export function buildPropertyWhere(criteria: PropertyQueryCriteria): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  if (criteria.city) {
    where.city = criteria.city;
  }
  if (criteria.rentMax !== undefined && !Number.isNaN(criteria.rentMax)) {
    where.rent = { lte: criteria.rentMax };
  }
  if (criteria.buildingType) {
    where.buildingType = criteria.buildingType;
  }
  if (criteria.layout) {
    where.layout = criteria.layout;
  }
  if (criteria.areaSqmMin !== undefined && !Number.isNaN(criteria.areaSqmMin)) {
    where.areaSqm = { gte: criteria.areaSqmMin };
  }
  if (criteria.maxAge !== undefined && !Number.isNaN(criteria.maxAge)) {
    // 築年数上限 → 築年（西暦）の下限に変換
    const minBuiltYear = new Date().getFullYear() - criteria.maxAge;
    where.builtYear = { gte: minBuiltYear };
  }
  if (criteria.stationWalkMax !== undefined && !Number.isNaN(criteria.stationWalkMax)) {
    where.stationWalkMin = { lte: criteria.stationWalkMax };
  }
  if (criteria.hasParking !== undefined) {
    where.hasParking = criteria.hasParking;
  }
  if (criteria.depositMax !== undefined && !Number.isNaN(criteria.depositMax)) {
    where.deposit = { lte: criteria.depositMax };
  }
  if (criteria.keyMoneyMax !== undefined && !Number.isNaN(criteria.keyMoneyMax)) {
    where.keyMoney = { lte: criteria.keyMoneyMax };
  }

  return where;
}
