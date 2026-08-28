import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import PropertyCard from "@/components/PropertyCard";
import SearchFilters from "@/components/SearchFilters";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import { prisma } from "@/lib/prisma";
import { computeDefaultSimulation } from "@/lib/propertySimulation";
import { describeFilters, buildRemoveParamHref } from "@/lib/filterChips";
import { buildPropertyWhere } from "@/lib/propertyQuery";
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
  // 掲載終了(ENDED)の物件は通常の検索結果には表示しない。
  // UNKNOWN（自動照合で未確認）はまだ「終了」と確定していないため表示対象に含める。
  // 条件そのもの（家賃・面積・駅距離等）の判定ロジックは保存検索条件のマッチングとも
  // 共有しているため src/lib/propertyQuery.ts に集約している。
  return { ...buildPropertyWhere(filters), listingStatus: { not: "ENDED" } };
}

// 現在の検索条件のうち、保存検索条件(SavedSearch)が対応する項目だけを
// クエリ文字列にして /saved-searches/new に引き継ぐ（フォームの初期値に使う）。
function buildSavedSearchQuery(filters: SearchFiltersType): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.rentMax !== undefined) params.set("rentMax", String(filters.rentMax));
  if (filters.buildingType) params.set("buildingType", filters.buildingType);
  if (filters.areaSqmMin !== undefined) params.set("areaSqmMin", String(filters.areaSqmMin));
  if (filters.maxAge !== undefined) params.set("maxAge", String(filters.maxAge));
  if (filters.stationWalkMax !== undefined) params.set("stationWalkMax", String(filters.stationWalkMax));
  if (filters.hasParking) params.set("hasParking", "true");
  return params.toString();
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

  // listingStatus を最優先の並び順とし（ACTIVEを先に）、その中で選択中のソートを適用する。
  // "ACTIVE" < "UNKNOWN" のアルファベット順に依存しているため、ステータスの種類を
  // 増やす場合はこの前提を見直すこと。
  let properties = await prisma.property.findMany({
    where,
    include: { simulationInput: true, favorite: true },
    orderBy: [{ listingStatus: "asc" }, orderBy ?? { minpakuScore: "desc" }],
  });

  if (filters.sort === "profit") {
    const statusPriority: Record<string, number> = { ACTIVE: 0, UNKNOWN: 1, ENDED: 2 };
    properties = [...properties].sort((a, b) => {
      const statusDiff = statusPriority[a.listingStatus] - statusPriority[b.listingStatus];
      if (statusDiff !== 0) return statusDiff;
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{properties.length}件の物件が見つかりました</p>
        <Link
          href={`/saved-searches/new?${buildSavedSearchQuery(filters)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          🔔 この条件を保存して新着通知を受け取る
        </Link>
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
