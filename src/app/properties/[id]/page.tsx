import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateMinpakuScore } from "@/lib/score";
import { buildingTypeLabel, calcAge, formatYen } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import SimulationPanel from "@/components/SimulationPanel";
import FavoriteButton from "@/components/FavoriteButton";

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
    include: { simulationInput: true, favorite: true },
  });

  if (!property) {
    notFound();
  }

  const { breakdown } = calculateMinpakuScore({
    rent: property.rent,
    areaSqm: property.areaSqm,
    stationWalkMin: property.stationWalkMin,
    hasParking: property.hasParking,
    buildingType: property.buildingType,
    builtYear: property.builtYear,
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
        {property.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.photoUrl}
            alt={property.name}
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400">
            物件写真（未登録）
          </div>
        )}

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

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <Field label="建物種別" value={buildingTypeLabel[property.buildingType]} />
            <Field label="家賃" value={formatYen(property.rent)} />
            <Field label="管理費" value={formatYen(property.managementFee)} />
            <Field label="間取り" value={property.layout} />
            <Field label="専有面積" value={`${property.areaSqm}m²`} />
            <Field label="築年数" value={`築${calcAge(property.builtYear)}年（${property.builtYear}年築）`} />
            <Field
              label="駅距離"
              value={`${property.stationName ? `${property.stationName} ` : ""}徒歩${property.stationWalkMin}分`}
            />
            <Field label="駐車場" value={property.hasParking ? "あり" : "なし"} />
            <Field label="敷金" value={formatYen(property.deposit)} />
            <Field label="礼金" value={formatYen(property.keyMoney)} />
            <Field
              label="初期費用"
              value={property.initialCost ? formatYen(property.initialCost) : "-"}
            />
          </dl>

          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-700">民泊適性スコアの内訳（仮ロジック）</h2>
            <ScoreBreakdown breakdown={breakdown} />
          </div>

          {property.memo && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-slate-700">メモ</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{property.memo}</p>
            </div>
          )}
        </div>
      </div>

      {sim && (
        <SimulationPanel
          rent={property.rent}
          managementFee={property.managementFee}
          initialNightlyPrice={sim.nightlyPrice}
          initialOccupancyRate={sim.occupancyRate}
          initialUtilityCost={sim.utilityCost}
          initialCleaningCost={sim.cleaningCost}
          initialSuppliesCost={sim.suppliesCost}
          initialOtherCost={sim.otherCost}
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
