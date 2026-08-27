import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateMinpakuScore } from "@/lib/score";
import { getRegulationLevel } from "@/lib/regions";
import { buildingTypeLabel, calcAge, formatYen } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import SimulationPanel from "@/components/SimulationPanel";
import FavoriteButton from "@/components/FavoriteButton";
import PropertyPhoto from "@/components/PropertyPhoto";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propertyId = Number(id);

  if (!Number.isInteger(propertyId)) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      simulationInput: true,
      favorite: true,
      nearbyAttractions: { orderBy: { distanceKm: "asc" } },
      competitors: true,
    },
  });

  if (!property) {
    notFound();
  }

  const nearestAttractionKm =
    property.nearbyAttractions.length > 0
      ? Math.min(...property.nearbyAttractions.map((a) => a.distanceKm))
      : null;
  const nearbyAttractionCount = property.nearbyAttractions.filter((a) => a.distanceKm <= 5).length;
  const competitorCount = property.competitors.filter((c) => c.distanceKm <= 2).length;

  const { breakdown } = calculateMinpakuScore({
    rent: property.rent,
    areaSqm: property.areaSqm,
    stationWalkMin: property.stationWalkMin,
    hasParking: property.hasParking,
    buildingType: property.buildingType,
    builtYear: property.builtYear,
    nearestAttractionKm,
    nearbyAttractionCount,
    competitorCount,
    regulationLevel: getRegulationLevel(property.city),
  });

  const sim = property.simulationInput;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← 物件検索に戻る
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <PropertyPhoto
          photoUrl={property.photoUrl}
          name={property.name}
          buildingType={property.buildingType}
          className="h-56 w-full sm:h-64"
        />

        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{property.address}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ScoreBadge score={property.minpakuScore} size="lg" />
              <FavoriteButton propertyId={property.id} initialFavorited={!!property.favorite} />
            </div>
          </div>

          <h2 className="mt-6 text-sm font-bold text-slate-700">物件情報</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <Field label="建物種別" value={buildingTypeLabel[property.buildingType]} />
            <Field label="家賃" value={formatYen(property.rent)} />
            <Field label="管理費" value={formatYen(property.managementFee)} />
            <Field label="敷金" value={formatYen(property.deposit)} />
            <Field label="礼金" value={formatYen(property.keyMoney)} />
            <Field label="間取り" value={property.layout} />
            <Field label="専有面積" value={`${property.areaSqm}m²`} />
            <Field label="築年数" value={`築${calcAge(property.builtYear)}年（${property.builtYear}年築）`} />
            <Field
              label="駅徒歩"
              value={`${property.stationName ? `${property.stationName} ` : ""}徒歩${property.stationWalkMin}分`}
            />
            <Field label="駐車場" value={property.hasParking ? "あり" : "なし"} />
            <Field
              label="初期費用"
              value={property.initialCost ? formatYen(property.initialCost) : "-"}
            />
          </dl>

          {property.memo && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-slate-700">メモ</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{property.memo}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">民泊分析</h2>
        <p className="mt-1 text-xs text-slate-400">
          民泊適性スコアの内訳（仮ロジック）と、周辺観光地・競合の状況です。
        </p>
        <ScoreBreakdown breakdown={breakdown} />

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-slate-700">
            周辺観光地（{property.nearbyAttractions.length}件）
          </h3>
          {property.nearbyAttractions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">周辺観光地の情報は未登録です。</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {property.nearbyAttractions.map((a) => (
                <li
                  key={a.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                >
                  {a.name}（約{a.distanceKm}km）
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-700">
            周辺の競合民泊（半径2km圏内 {competitorCount}件 ／ 登録全{property.competitors.length}件）
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            ※サンプルデータによる仮の件数です。実際の掲載件数を保証するものではありません。
          </p>
        </div>
      </div>

      {sim && (
        <SimulationPanel
          managementFee={property.managementFee}
          initialRent={property.rent}
          initialNightlyPrice={sim.nightlyPrice}
          initialOccupancyRate={sim.occupancyRate}
          initialUtilityCost={sim.utilityCost}
          initialCleaningCost={sim.cleaningCost}
          initialSuppliesCost={sim.suppliesCost}
          initialOtaFeeRate={sim.otaFeeRate}
          initialOtherCost={sim.otherCost}
          initialCost={property.initialCost}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
