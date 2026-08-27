import Link from "next/link";
import ScoreBadge from "@/components/ScoreBadge";
import { buildingTypeLabel, calcAge, formatYen } from "@/lib/format";
import type { PropertyWithRelations } from "@/lib/types";

export default function PropertyCard({ property }: { property: PropertyWithRelations }) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{property.name}</h2>
          <p className="text-sm text-slate-500">
            {property.area} ・ {buildingTypeLabel[property.buildingType]}
          </p>
        </div>
        <ScoreBadge score={property.minpakuScore} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-400">家賃</dt>
          <dd className="font-semibold text-slate-800">{formatYen(property.rent)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">管理費</dt>
          <dd className="font-semibold text-slate-800">{formatYen(property.managementFee)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">専有面積</dt>
          <dd className="font-semibold text-slate-800">{property.areaSqm}m²</dd>
        </div>
        <div>
          <dt className="text-slate-400">間取り</dt>
          <dd className="font-semibold text-slate-800">{property.layout}</dd>
        </div>
        <div>
          <dt className="text-slate-400">築年数</dt>
          <dd className="font-semibold text-slate-800">築{calcAge(property.builtYear)}年</dd>
        </div>
        <div>
          <dt className="text-slate-400">駅徒歩</dt>
          <dd className="font-semibold text-slate-800">
            {property.stationName ? `${property.stationName} ` : ""}
            徒歩{property.stationWalkMin}分
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">駐車場</dt>
          <dd className="font-semibold text-slate-800">
            {property.hasParking ? "あり" : "なし"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
