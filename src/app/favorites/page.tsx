import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateSimulation } from "@/lib/simulation";
import { buildingTypeLabel, formatYen } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";

export default async function FavoritesPage() {
  const favorites = await prisma.favorite.findMany({
    include: { property: { include: { simulationInput: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = favorites
    .filter((f) => f.property.simulationInput)
    .map((f) => {
      const property = f.property;
      const sim = property.simulationInput!;
      const result = calculateSimulation({
        rent: property.rent,
        managementFee: property.managementFee,
        nightlyPrice: sim.nightlyPrice,
        occupancyRate: sim.occupancyRate,
        utilityCost: sim.utilityCost,
        cleaningCost: sim.cleaningCost,
        suppliesCost: sim.suppliesCost,
        otherCost: sim.otherCost,
      });
      return { property, result };
    })
    .sort((a, b) => b.result.profit - a.result.profit);

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
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">物件名</th>
                <th className="px-4 py-3">エリア</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">家賃</th>
                <th className="px-4 py-3">民泊適性スコア</th>
                <th className="px-4 py-3">想定月間売上</th>
                <th className="px-4 py-3">想定利益/月</th>
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
                  <td className="px-4 py-3 text-slate-600">{property.area}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {buildingTypeLabel[property.buildingType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatYen(property.rent)}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={property.minpakuScore} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatYen(result.monthlySales)}</td>
                  <td
                    className={`px-4 py-3 font-bold ${result.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {result.profit >= 0 ? "+" : ""}
                    {formatYen(result.profit)}
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
