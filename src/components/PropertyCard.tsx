import Link from "next/link";
import PropertyPhoto from "@/components/PropertyPhoto";
import ScoreBadge from "@/components/ScoreBadge";
import ProfitBadge from "@/components/ProfitBadge";
import { buildingTypeLabel, calcAge, formatYen } from "@/lib/format";
import { computeDefaultSimulation } from "@/lib/propertySimulation";
import type { PropertyWithRelations } from "@/lib/types";

export default function PropertyCard({ property }: { property: PropertyWithRelations }) {
  const simulation = computeDefaultSimulation(property);

  return (
    <Link
      href={`/properties/${property.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-400 hover:shadow-md"
    >
      <PropertyPhoto
        photoUrl={property.photoUrl}
        name={property.name}
        buildingType={property.buildingType}
        className="h-36 w-full"
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="text-base font-bold leading-snug text-slate-900">{property.name}</h2>
          <p className="text-xs text-slate-500">
            {property.city} ・ {buildingTypeLabel[property.buildingType]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ScoreBadge score={property.minpakuScore} size="sm" />
          {simulation && <ProfitBadge profit={simulation.monthlyProfit} size="sm" />}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-slate-400">家賃</dt>
            <dd className="font-semibold text-slate-800">{formatYen(property.rent)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">管理費</dt>
            <dd className="font-semibold text-slate-800">{formatYen(property.managementFee)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">間取り</dt>
            <dd className="font-semibold text-slate-800">{property.layout}</dd>
          </div>
          <div>
            <dt className="text-slate-400">専有面積</dt>
            <dd className="font-semibold text-slate-800">{property.areaSqm}m²</dd>
          </div>
          <div>
            <dt className="text-slate-400">築年数</dt>
            <dd className="font-semibold text-slate-800">築{calcAge(property.builtYear)}年</dd>
          </div>
          <div>
            <dt className="text-slate-400">駅徒歩</dt>
            <dd className="font-semibold text-slate-800">徒歩{property.stationWalkMin}分</dd>
          </div>
          <div>
            <dt className="text-slate-400">駐車場</dt>
            <dd className="font-semibold text-slate-800">
              {property.hasParking ? "あり" : "なし"}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
