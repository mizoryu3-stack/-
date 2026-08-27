import Link from "next/link";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

export default function SearchFilters({ filters }: { filters: SearchFiltersType }) {
  return (
    <form
      method="GET"
      action="/"
      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="area" className="text-sm font-medium text-slate-600">
          エリア
        </label>
        <input
          id="area"
          name="area"
          type="text"
          placeholder="例: 京都市"
          defaultValue={filters.area ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rentMax" className="text-sm font-medium text-slate-600">
          家賃上限（円）
        </label>
        <input
          id="rentMax"
          name="rentMax"
          type="number"
          step="1000"
          placeholder="例: 150000"
          defaultValue={filters.rentMax ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="buildingType" className="text-sm font-medium text-slate-600">
          建物種別
        </label>
        <select
          id="buildingType"
          name="buildingType"
          defaultValue={filters.buildingType ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">指定なし</option>
          <option value="HOUSE">戸建て</option>
          <option value="APARTMENT">マンション</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="areaSqmMin" className="text-sm font-medium text-slate-600">
          専有面積下限（m²）
        </label>
        <input
          id="areaSqmMin"
          name="areaSqmMin"
          type="number"
          step="1"
          placeholder="例: 30"
          defaultValue={filters.areaSqmMin ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="maxAge" className="text-sm font-medium text-slate-600">
          築年数上限（年）
        </label>
        <input
          id="maxAge"
          name="maxAge"
          type="number"
          step="1"
          placeholder="例: 20"
          defaultValue={filters.maxAge ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="stationWalkMax" className="text-sm font-medium text-slate-600">
          駅徒歩上限（分）
        </label>
        <input
          id="stationWalkMax"
          name="stationWalkMax"
          type="number"
          step="1"
          placeholder="例: 10"
          defaultValue={filters.stationWalkMax ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="hasParking" className="text-sm font-medium text-slate-600">
          駐車場
        </label>
        <select
          id="hasParking"
          name="hasParking"
          defaultValue={
            filters.hasParking === undefined ? "" : filters.hasParking ? "true" : "false"
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">指定なし</option>
          <option value="true">あり</option>
          <option value="false">なし</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="depositMax" className="text-sm font-medium text-slate-600">
          敷金上限（円）
        </label>
        <input
          id="depositMax"
          name="depositMax"
          type="number"
          step="1000"
          placeholder="例: 100000"
          defaultValue={filters.depositMax ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="keyMoneyMax" className="text-sm font-medium text-slate-600">
          礼金上限（円）
        </label>
        <input
          id="keyMoneyMax"
          name="keyMoneyMax"
          type="number"
          step="1000"
          placeholder="例: 100000"
          defaultValue={filters.keyMoneyMax ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-end gap-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          この条件で検索
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          条件をクリア
        </Link>
      </div>
    </form>
  );
}
