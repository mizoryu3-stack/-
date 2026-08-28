"use client";

import { useActionState } from "react";
import {
  updateDailySearchScheduleAction,
  type DailySearchScheduleFormState,
} from "@/app/settings/actions";
import { DEFAULT_TIMEZONE } from "@/lib/schedule/scheduleTime";

const initialState: DailySearchScheduleFormState = { errors: [], success: false };

export default function DailySearchScheduleForm({
  defaultValues,
}: {
  defaultValues: { enabled: boolean; time: string };
}) {
  const [state, formAction, pending] = useActionState(updateDailySearchScheduleAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={defaultValues.enabled}
          className="h-4 w-4 rounded border-slate-300"
        />
        自動探索を有効にする
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">探索時刻</span>
        <input
          type="time"
          name="time"
          required
          defaultValue={defaultValues.time}
          className="input-base w-40"
        />
        <span className="text-xs text-slate-400">
          毎日この時刻に自動探索を実行します（タイムゾーン: {DEFAULT_TIMEZONE}）。
        </span>
      </label>

      {state.errors.length > 0 && (
        <ul className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">保存しました。</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
