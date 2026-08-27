import Link from "next/link";
import { SUPPORTED_AREAS, LAYOUT_OPTIONS } from "@/lib/regions";
import { SORT_OPTIONS, type SearchFilters as SearchFiltersType } from "@/lib/types";

export default function SearchFilters({ filters }: { filters: SearchFiltersType }) {
  return (
    <details open className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer select-none list-none px-5 py-4 text-sm font-bold text-slate-700 marker:content-none">
        <span className="inline-flex items-center gap-2">🔍 検索条件を編集</span>
      </summary>

      <form method="GET" action="/" className="flex flex-col gap-4 border-t border-slate-100 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="地域">
            <select name="city" defaultValue={filters.city ?? ""} className="select-input">
              <option value="">指定なし</option>
              {SUPPORTED_AREAS.map((a) => (
                <option key={a.city} value={a.city}>
                  {a.city}
                </option>
              ))}
            </select>
          </Field>

          <Field label="家賃上限">
            <div className="flex items-center gap-1">
              <input
                name="rentMax"
                type="number"
                step="1000"
                inputMode="numeric"
                placeholder="例: 150000"
                defaultValue={filters.rentMax ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">円</span>
            </div>
          </Field>

          <Field label="建物種別">
            <select name="buildingType" defaultValue={filters.buildingType ?? ""} className="select-input">
              <option value="">指定なし</option>
              <option value="HOUSE">戸建て</option>
              <option value="APARTMENT">マンション</option>
            </select>
          </Field>

          <Field label="間取り">
            <select name="layout" defaultValue={filters.layout ?? ""} className="select-input">
              <option value="">指定なし</option>
              {LAYOUT_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          <Field label="専有面積下限">
            <div className="flex items-center gap-1">
              <input
                name="areaSqmMin"
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="例: 30"
                defaultValue={filters.areaSqmMin ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">m²</span>
            </div>
          </Field>

          <Field label="築年数上限">
            <div className="flex items-center gap-1">
              <input
                name="maxAge"
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="例: 20"
                defaultValue={filters.maxAge ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">年</span>
            </div>
          </Field>

          <Field label="駅徒歩上限">
            <div className="flex items-center gap-1">
              <input
                name="stationWalkMax"
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="例: 10"
                defaultValue={filters.stationWalkMax ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">分</span>
            </div>
          </Field>

          <Field label="駐車場">
            <select
              name="hasParking"
              defaultValue={filters.hasParking === undefined ? "" : filters.hasParking ? "true" : "false"}
              className="select-input"
            >
              <option value="">指定なし</option>
              <option value="true">あり</option>
              <option value="false">なし</option>
            </select>
          </Field>

          <Field label="敷金上限">
            <div className="flex items-center gap-1">
              <input
                name="depositMax"
                type="number"
                step="1000"
                inputMode="numeric"
                placeholder="例: 100000"
                defaultValue={filters.depositMax ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">円</span>
            </div>
          </Field>

          <Field label="礼金上限">
            <div className="flex items-center gap-1">
              <input
                name="keyMoneyMax"
                type="number"
                step="1000"
                inputMode="numeric"
                placeholder="例: 100000"
                defaultValue={filters.keyMoneyMax ?? ""}
                className="input-base"
              />
              <span className="text-xs text-slate-400">円</span>
            </div>
          </Field>

          <Field label="並び替え">
            <select name="sort" defaultValue={filters.sort} className="select-input">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:flex-none"
          >
            この条件で検索
          </button>
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            条件をクリア
          </Link>
        </div>
      </form>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
