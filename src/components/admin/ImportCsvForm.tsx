"use client";

import { useActionState } from "react";
import { importCsvAction, type ImportFormState } from "@/app/admin/actions";

const initialState: ImportFormState = {};

export default function ImportCsvForm() {
  const [state, formAction, isPending] = useActionState(importCsvAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-600">CSVファイル</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "取込中..." : "インポートを実行"}
      </button>
    </form>
  );
}
