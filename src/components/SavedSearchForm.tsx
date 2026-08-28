"use client";

import { useActionState } from "react";
import type { SavedSearchFormState } from "@/app/saved-searches/actions";
import { SUPPORTED_AREAS } from "@/lib/regions";
import { minpakuConsultationStatusLabel, type MinpakuConsultationStatus } from "@/lib/format";
import { VALID_MINPAKU_CONSULTATION_STATUSES } from "@/lib/ingestion/types";

const initialState: SavedSearchFormState = { errors: [] };

export interface SavedSearchDefaultValues {
  name?: string;
  city?: string;
  rentMax?: number;
  buildingType?: "HOUSE" | "APARTMENT";
  areaSqmMin?: number;
  maxAge?: number;
  stationWalkMax?: number;
  hasParking?: boolean;
  minpakuConsultationStatus?: MinpakuConsultationStatus;
  minMonthlyProfit?: number;
}

export default function SavedSearchForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: SavedSearchFormState, formData: FormData) => Promise<SavedSearchFormState>;
  defaultValues?: SavedSearchDefaultValues;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.errors.length > 0 && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">
          検索条件の名前 <span className="text-rose-500">*</span>
        </span>
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="例: 廿日市・戸建て・8万円以下"
          className="input-base"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">地域</span>
          <select name="city" defaultValue={defaultValues?.city ?? ""} className="select-input">
            <option value="">指定なし</option>
            {SUPPORTED_AREAS.map((a) => (
              <option key={a.city} value={a.city}>
                {a.city}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">建物種別</span>
          <select
            name="buildingType"
            defaultValue={defaultValues?.buildingType ?? ""}
            className="select-input"
          >
            <option value="">指定なし</option>
            <option value="HOUSE">戸建て</option>
            <option value="APARTMENT">マンション</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">家賃上限（円）</span>
          <input
            type="number"
            name="rentMax"
            step={1000}
            defaultValue={defaultValues?.rentMax}
            className="input-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">専有面積下限（m²）</span>
          <input
            type="number"
            name="areaSqmMin"
            step={1}
            defaultValue={defaultValues?.areaSqmMin}
            className="input-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">築年数上限（年）</span>
          <input
            type="number"
            name="maxAge"
            step={1}
            defaultValue={defaultValues?.maxAge}
            className="input-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">駅徒歩上限（分）</span>
          <input
            type="number"
            name="stationWalkMax"
            step={1}
            defaultValue={defaultValues?.stationWalkMax}
            className="input-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">民泊利用についての確認状況</span>
          <select
            name="minpakuConsultationStatus"
            defaultValue={defaultValues?.minpakuConsultationStatus ?? ""}
            className="select-input"
          >
            <option value="">指定なし</option>
            {VALID_MINPAKU_CONSULTATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {minpakuConsultationStatusLabel[status]}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            物件提供元から得た確認状況での絞り込みです（法的な民泊可否の断定ではありません）。
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">最低期待月間利益（円）</span>
          <input
            type="number"
            name="minMonthlyProfit"
            step={1000}
            defaultValue={defaultValues?.minMonthlyProfit}
            className="input-base"
          />
          <span className="text-xs text-slate-400">
            収益シミュレーションの初期値から算出した想定月間利益がこの金額以上の新着物件のみ通知します。
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="hasParking"
          defaultChecked={defaultValues?.hasParking === true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-medium text-slate-600">駐車場ありのみ</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
