import Link from "next/link";
import { prisma } from "@/lib/prisma";

// お気に入りの物件は、お気に入りボタン(Server Action)以外の経路
// （将来の外部データ再取込・掲載状態の自動照合など）でも listingStatus 等が更新されうる。
// 静的プリレンダリングされると新しい状態が反映されなくなるため、常に動的にレンダリングする。
export const dynamic = "force-dynamic";
import { computeDefaultSimulation } from "@/lib/propertySimulation";
import type { SimulationResult } from "@/lib/simulation";
import { buildingTypeLabel, formatYen } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";
import ListingStatusBadge from "@/components/ListingStatusBadge";

export default async function FavoritesPage() {
  const favorites = await prisma.favorite.findMany({
    include: { property: { include: { simulationInput: true } } },
    orderBy: { createdAt: "desc" },
  });

  type FavoriteProperty = (typeof favorites)[number]["property"];
  const rows: { property: FavoriteProperty; result: SimulationResult }[] = [];
  for (const f of favorites) {
    const result = computeDefaultSimulation(f.property);
    if (result) rows.push({ property: f.property, result });
  }
  rows.sort((a, b) => b.result.monthlyProfit - a.result.monthlyProfit);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お気に入り一覧</h1>
        <p className="mt-1 text-sm text-slate-500">
          民泊適性スコアと想定利益（保存された初期シミュレーション値ベース）で比較できます。
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          お気に入り登録された物件はまだありません。
          <br />
          物件検索画面から気になる物件を「☆ お気に入りに追加」してください。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">物件名</th>
                <th className="px-4 py-3">掲載状況</th>
                <th className="px-4 py-3">エリア</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">家賃</th>
                <th className="px-4 py-3">民泊適性スコア</th>
                <th className="px-4 py-3">想定月間売上</th>
                <th className="px-4 py-3">想定利益/月</th>
                <th className="px-4 py-3">想定利益/年</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ property, result }) => (
                <tr key={property.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    <Link href={`/properties/${property.id}`} className="hover:underline">
                      {property.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ListingStatusBadge status={property.listingStatus} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{property.city}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {buildingTypeLabel[property.buildingType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatYen(property.rent)}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={property.minpakuScore} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatYen(result.monthlySales)}</td>
                  <td
                    className={`px-4 py-3 font-bold ${result.monthlyProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {result.monthlyProfit >= 0 ? "+" : ""}
                    {formatYen(result.monthlyProfit)}
                  </td>
                  <td
                    className={`px-4 py-3 font-bold ${result.annualProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {result.annualProfit >= 0 ? "+" : ""}
                    {formatYen(result.annualProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
