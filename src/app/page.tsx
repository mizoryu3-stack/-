import type { Prisma } from "@/generated/prisma/client";
import PropertyCard from "@/components/PropertyCard";
import SearchFilters from "@/components/SearchFilters";
import { prisma } from "@/lib/prisma";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(params: RawSearchParams): SearchFiltersType {
  const area = first(params.area)?.trim();
  const rentMax = first(params.rentMax);
  const buildingType = first(params.buildingType);
  const areaSqmMin = first(params.areaSqmMin);
  const maxAge = first(params.maxAge);
  const stationWalkMax = first(params.stationWalkMax);
  const hasParking = first(params.hasParking);
  const depositMax = first(params.depositMax);
  const keyMoneyMax = first(params.keyMoneyMax);

  return {
    area: area || undefined,
    rentMax: rentMax ? Number(rentMax) : undefined,
    buildingType: buildingType === "HOUSE" || buildingType === "APARTMENT" ? buildingType : undefined,
    areaSqmMin: areaSqmMin ? Number(areaSqmMin) : undefined,
    maxAge: maxAge ? Number(maxAge) : undefined,
    stationWalkMax: stationWalkMax ? Number(stationWalkMax) : undefined,
    hasParking: hasParking === "true" ? true : hasParking === "false" ? false : undefined,
    depositMax: depositMax ? Number(depositMax) : undefined,
    keyMoneyMax: keyMoneyMax ? Number(keyMoneyMax) : undefined,
  };
}

function buildWhere(filters: SearchFiltersType): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  if (filters.area) {
    where.area = { contains: filters.area };
  }
  if (filters.rentMax !== undefined && !Number.isNaN(filters.rentMax)) {
    where.rent = { lte: filters.rentMax };
  }
  if (filters.buildingType) {
    where.buildingType = filters.buildingType;
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);
  const where = buildWhere(filters);

  const properties = await prisma.property.findMany({
    where,
    include: { simulationInput: true, favorite: true },
    orderBy: { minpakuScore: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">物件検索</h1>
        <p className="mt-1 text-sm text-slate-500">
          「この物件を借りて民泊をしたら儲かりそうか？」を判断するための物件検索です。
        </p>
      </div>

      <SearchFilters filters={filters} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{properties.length}件の物件が見つかりました</p>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          条件に合う物件が見つかりませんでした。条件を変更してお試しください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
