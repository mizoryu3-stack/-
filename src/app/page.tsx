import type { Prisma } from "@/generated/prisma/client";
import PropertyCard from "@/components/PropertyCard";
import SearchFilters from "@/components/SearchFilters";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import { prisma } from "@/lib/prisma";
import { computeDefaultSimulation } from "@/lib/propertySimulation";
import { describeFilters, buildRemoveParamHref } from "@/lib/filterChips";
import { SORT_OPTIONS, type SearchFilters as SearchFiltersType, type SortValue } from "@/lib/types";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const VALID_SORT_VALUES = SORT_OPTIONS.map((o) => o.value);

function parseFilters(params: RawSearchParams): SearchFiltersType {
  const city = first(params.city)?.trim();
  const rentMax = first(params.rentMax);
  const buildingType = first(params.buildingType);
  const layout = first(params.layout)?.trim();
  const areaSqmMin = first(params.areaSqmMin);
  const maxAge = first(params.maxAge);
  const stationWalkMax = first(params.stationWalkMax);
  const hasParking = first(params.hasParking);
  const depositMax = first(params.depositMax);
  const keyMoneyMax = first(params.keyMoneyMax);
  const sortParam = first(params.sort);

  return {
    city: city || undefined,
    rentMax: rentMax ? Number(rentMax) : undefined,
    buildingType: buildingType === "HOUSE" || buildingType === "APARTMENT" ? buildingType : undefined,
    layout: layout || undefined,
    areaSqmMin: areaSqmMin ? Number(areaSqmMin) : undefined,
    maxAge: maxAge ? Number(maxAge) : undefined,
    stationWalkMax: stationWalkMax ? Number(stationWalkMax) : undefined,
    hasParking: hasParking === "true" ? true : hasParking === "false" ? false : undefined,
    depositMax: depositMax ? Number(depositMax) : undefined,
    keyMoneyMax: keyMoneyMax ? Number(keyMoneyMax) : undefined,
    sort: (VALID_SORT_VALUES as string[]).includes(sortParam ?? "")
      ? (sortParam as SortValue)
      : "score",
  };
}

function buildWhere(filters: SearchFiltersType): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  if (filters.city) {
    where.city = filters.city;
  }
  if (filters.rentMax !== undefined && !Number.isNaN(filters.rentMax)) {
    where.rent = { lte: filters.rentMax };
  }
  if (filters.buildingType) {
    where.buildingType = filters.buildingType;
  }
  if (filters.layout) {
    where.layout = filters.layout;
  }
  if (filters.areaSqmMin !== undefined && !Number.isNaN(filters.areaSqmMin)) {
    where.areaSqm = { gte: filters.areaSqmMin };
  }
  if (filters.maxAge !== undefined && !Number.isNaN(filters.maxAge)) {
    // 築年数上限 → 築年（西暦）の下限に変換
    const minBuiltYear = new Date().getFullYear() - filters.maxAge;
    where.builtYear = { gte: minBuiltYear };
  }
  if (filters.stationWalkMax !== undefined && !Number.isNaN(filters.stationWalkMax)) {
    where.stationWalkMin = { lte: filters.stationWalkMax };
  }
  if (filters.hasParking !== undefined) {
    where.hasParking = filters.hasParking;
  }
  if (filters.depositMax !== undefined && !Number.isNaN(filters.depositMax)) {
    where.deposit = { lte: filters.depositMax };
  }
  if (filters.keyMoneyMax !== undefined && !Number.isNaN(filters.keyMoneyMax)) {
    where.keyMoney = { lte: filters.keyMoneyMax };
  }

  return where;
}

function sortOrderBy(sort: SortValue): Prisma.PropertyOrderByWithRelationInput | undefined {
  switch (sort) {
    case "score":
      return { minpakuScore: "desc" };
    case "rentAsc":
      return { rent: "asc" };
    case "newest":
      return { createdAt: "desc" };
    case "profit":
      // 想定利益はDBに保存されていないためJS側でソートする（buildWhere後に別処理）
      return undefined;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);
  const where = buildWhere(filters);
  const orderBy = sortOrderBy(filters.sort);

  let properties = await prisma.property.findMany({
    where,
    include: { simulationInput: true, favorite: true },
    orderBy: orderBy ?? { minpakuScore: "desc" },
  });

  if (filters.sort === "profit") {
    properties = [...properties].sort((a, b) => {
      const profitA = computeDefaultSimulation(a)?.monthlyProfit ?? -Infinity;
      const profitB = computeDefaultSimulation(b)?.monthlyProfit ?? -Infinity;
      return profitB - profitA;
    });
  }

  const chips = describeFilters(filters).map((chip) => ({
    ...chip,
    href: buildRemoveParamHref(rawParams, chip.key),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">物件検索</h1>
        <p className="mt-1 text-sm text-slate-500">
          「この物件を借りて民泊をしたら儲かりそうか？」を判断するための物件検索です（現在は広島県の一部エリアに対応）。
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">現在の検索条件</p>
        <ActiveFilterChips chips={chips} />
      </div>

      {/*
        key に検索条件のシリアライズ値を渡すことで、フィルタチップの削除など
        URLだけが変わるクライアント遷移が起きたときにフォームを強制的に再マウントする。
        （defaultValueは初回マウント時にしか反映されないため、keyが無いと
        　セレクトボックス等の表示が古い値のまま残ってしまう）
      */}
      <SearchFilters key={JSON.stringify(filters)} filters={filters} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{properties.length}件の物件が見つかりました</p>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          条件に合う物件が見つかりませんでした。条件を変更してお試しください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
