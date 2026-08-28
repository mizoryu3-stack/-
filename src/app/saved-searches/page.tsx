import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildingTypeLabel, formatYen, minpakuConsultationStatusLabel, type MinpakuConsultationStatus } from "@/lib/format";
import { deleteSavedSearch, toggleSavedSearch } from "@/app/saved-searches/actions";

export const dynamic = "force-dynamic";

function summarize(search: {
  city: string | null;
  buildingType: "HOUSE" | "APARTMENT" | null;
  rentMax: number | null;
  areaSqmMin: number | null;
  maxAge: number | null;
  stationWalkMax: number | null;
  hasParking: boolean | null;
  minpakuConsultationStatus: MinpakuConsultationStatus | null;
  minMonthlyProfit: number | null;
}): string {
  const parts: string[] = [];
  if (search.city) parts.push(search.city);
  if (search.buildingType) parts.push(buildingTypeLabel[search.buildingType]);
  if (search.rentMax !== null) parts.push(`家賃${formatYen(search.rentMax)}以下`);
  if (search.areaSqmMin !== null) parts.push(`${search.areaSqmMin}m²以上`);
  if (search.maxAge !== null) parts.push(`築${search.maxAge}年以内`);
  if (search.stationWalkMax !== null) parts.push(`駅徒歩${search.stationWalkMax}分以内`);
  if (search.hasParking) parts.push("駐車場あり");
  if (search.minpakuConsultationStatus) {
    parts.push(`民泊: ${minpakuConsultationStatusLabel[search.minpakuConsultationStatus]}`);
  }
  if (search.minMonthlyProfit !== null) parts.push(`想定月間利益${formatYen(search.minMonthlyProfit)}以上`);
  return parts.length > 0 ? parts.join(" ・ ") : "条件なし（すべての新着物件が対象）";
}

export default async function SavedSearchesPage() {
  const savedSearches = await prisma.savedSearch.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">保存した検索条件</h1>
          <p className="mt-1 text-sm text-slate-500">
            条件に一致する新着物件が登録されると、通知一覧に表示されます。
          </p>
        </div>
        <Link
          href="/saved-searches/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + 新しい検索条件を保存
        </Link>
      </div>

      {savedSearches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          保存された検索条件はまだありません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {savedSearches.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${s.enabled ? "border-slate-200" : "border-slate-200 opacity-60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{s.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{summarize(s)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    これまでのマッチ件数: {s._count.matches}件
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={toggleSavedSearch.bind(null, s.id, !s.enabled)}>
                    <button
                      type="submit"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        s.enabled
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.enabled ? "ON" : "OFF"}
                    </button>
                  </form>
                  <Link
                    href={`/saved-searches/${s.id}/edit`}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    編集
                  </Link>
                  <form action={deleteSavedSearch.bind(null, s.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
