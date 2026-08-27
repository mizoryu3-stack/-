"use client";

import { useMemo, useState } from "react";
import { calculateSimulation } from "@/lib/simulation";
import { formatYen } from "@/lib/format";

interface Props {
  rent: number;
  managementFee: number;
  initialNightlyPrice: number;
  initialOccupancyRate: number; // 0.0 - 1.0
  initialUtilityCost: number;
  initialCleaningCost: number;
  initialSuppliesCost: number;
  initialOtherCost: number;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1000,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

export default function SimulationPanel({
  rent,
  managementFee,
  initialNightlyPrice,
  initialOccupancyRate,
  initialUtilityCost,
  initialCleaningCost,
  initialSuppliesCost,
  initialOtherCost,
}: Props) {
  const [nightlyPrice, setNightlyPrice] = useState(initialNightlyPrice);
  const [occupancyPercent, setOccupancyPercent] = useState(
    Math.round(initialOccupancyRate * 100),
  );
  const [utilityCost, setUtilityCost] = useState(initialUtilityCost);
  const [cleaningCost, setCleaningCost] = useState(initialCleaningCost);
  const [suppliesCost, setSuppliesCost] = useState(initialSuppliesCost);
  const [otherCost, setOtherCost] = useState(initialOtherCost);

  const result = useMemo(
    () =>
      calculateSimulation({
        rent,
        managementFee,
        nightlyPrice,
        occupancyRate: occupancyPercent / 100,
        utilityCost,
        cleaningCost,
        suppliesCost,
        otherCost,
      }),
    [rent, managementFee, nightlyPrice, occupancyPercent, utilityCost, cleaningCost, suppliesCost, otherCost],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">収益シミュレーション</h2>
      <p className="mt-1 text-xs text-slate-400">
        数値は自由に変更できます。変更するとその場で再計算されます。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="想定宿泊単価"
          value={nightlyPrice}
          onChange={setNightlyPrice}
          suffix="円/泊"
          step={500}
        />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-600">想定稼働率</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={occupancyPercent}
              onChange={(e) => setOccupancyPercent(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </label>
        <NumberField label="水道光熱費" value={utilityCost} onChange={setUtilityCost} suffix="円/月" />
        <NumberField label="清掃費" value={cleaningCost} onChange={setCleaningCost} suffix="円/月" />
        <NumberField label="消耗品費" value={suppliesCost} onChange={setSuppliesCost} suffix="円/月" />
        <NumberField label="その他経費" value={otherCost} onChange={setOtherCost} suffix="円/月" />
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-400">月間宿泊日数</dt>
            <dd className="font-semibold text-slate-800">{result.monthlyNights}日</dd>
          </div>
          <div>
            <dt className="text-slate-400">家賃</dt>
            <dd className="font-semibold text-slate-800">{formatYen(rent)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">月間経費合計</dt>
            <dd className="font-semibold text-slate-800">{formatYen(result.totalCost)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">月間売上</dt>
            <dd className="text-lg font-bold text-slate-900">{formatYen(result.monthlySales)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">想定利益（月額）</p>
          <p
            className={`text-3xl font-extrabold ${result.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
          >
            {result.profit >= 0 ? "+" : ""}
            {formatYen(result.profit)}
            <span className="ml-1 text-base font-medium text-slate-400">/月</span>
          </p>
        </div>
      </div>
    </div>
  );
}
