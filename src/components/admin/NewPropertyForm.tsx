"use client";

import { useActionState } from "react";
import { createPropertyManually, type FormState } from "@/app/admin/actions";
import { SUPPORTED_AREAS } from "@/lib/regions";

const initialState: FormState = { errors: [] };

export default function NewPropertyForm() {
  const [state, formAction, isPending] = useActionState(createPropertyManually, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.errors.length > 0 && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-bold">入力内容をご確認ください</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="基本情報">
        <Field label="物件名" name="name" required />
        <Field label="住所" name="address" required />
        <SelectField
          label="市区町村"
          name="city"
          required
          options={SUPPORTED_AREAS.map((a) => ({ value: a.city, label: a.city }))}
        />
        <Field label="緯度" name="latitude" type="number" step="0.0001" />
        <Field label="経度" name="longitude" type="number" step="0.0001" />
      </Section>

      <Section title="物件情報">
        <SelectField
          label="物件種別"
          name="buildingType"
          required
          options={[
            { value: "APARTMENT", label: "マンション" },
            { value: "HOUSE", label: "戸建て" },
          ]}
        />
        <Field label="間取り" name="layout" placeholder="例: 1LDK" required />
        <Field label="専有面積(m²)" name="areaSqm" type="number" step="0.1" required />
        <Field label="築年（西暦）" name="builtYear" type="number" placeholder="例: 2015" required />
        <Field label="最寄駅名" name="stationName" />
        <Field label="駅徒歩(分)" name="stationWalkMin" type="number" required />
        <CheckboxField label="駐車場あり" name="hasParking" />
      </Section>

      <Section title="費用">
        <Field label="家賃(円)" name="rent" type="number" required />
        <Field label="管理費(円)" name="managementFee" type="number" />
        <Field label="敷金(円)" name="deposit" type="number" />
        <Field label="礼金(円)" name="keyMoney" type="number" />
        <Field label="初期費用(円)" name="initialCost" type="number" />
      </Section>

      <Section title="データ出所・掲載状態">
        <Field label="写真URL" name="photoUrl" type="url" />
        <Field label="元サイトURL" name="sourceUrl" type="url" />
        <Field label="取得元" name="source" placeholder="admin（デフォルト）" />
        <Field label="外部ID (externalId)" name="externalId" />
        <SelectField
          label="掲載状態"
          name="listingStatus"
          options={[
            { value: "ACTIVE", label: "掲載中" },
            { value: "ENDED", label: "掲載終了" },
            { value: "UNKNOWN", label: "確認できません" },
          ]}
        />
        <Field label="初回確認日時" name="firstSeenAt" type="datetime-local" />
        <Field label="最終確認日時" name="lastCheckedAt" type="datetime-local" />
      </Section>

      <div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">メモ</span>
          <textarea name="memo" rows={3} className="input-base" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "登録中..." : "この内容で登録する"}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-bold text-slate-700">{title}</legend>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        name={name}
        step={step}
        placeholder={placeholder}
        required={required}
        className="input-base"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <select name={name} className="select-input" defaultValue="" required={required}>
        <option value="" disabled>
          選択してください
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} className="h-4 w-4 rounded border-slate-300" />
      <span className="font-medium text-slate-600">{label}</span>
    </label>
  );
}
