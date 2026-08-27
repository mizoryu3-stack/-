"use client";

import { useMemo, useState } from "react";
import { calculateSimulation } from "@/lib/simulation";
import { formatPaybackPeriod, formatPercent, formatYen } from "@/lib/format";

interface Props {
  managementFee: number;
  initialRent: number;
  initialNightlyPrice: number;
  initialOccupancyRate: number; // 0.0 - 1.0
  initialUtilityCost: number;
  initialCleaningCost: number;
  initialSuppliesCost: number;
  initialOtaFeeRate: number; // 0.0 - 1.0
  initialOtherCost: number;
  initialCost: number | null;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1000,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
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
  managementFee,
  initialRent,
  initialNightlyPrice,
  initialOccupancyRate,
  initialUtilityCost,
  initialCleaningCost,
  initialSuppliesCost,
  initialOtaFeeRate,
  initialOtherCost,
  initialCost,
}: Props) {
  const [rent, setRent] = useState(initialRent);
  const [nightlyPrice, setNightlyPrice] = useState(initialNightlyPrice);
  const [occupancyPercent, setOccupancyPercent] = useState(
    Math.round(initialOccupancyRate * 100),
  );
  const [utilityCost, setUtilityCost] = useState(initialUtilityCost);
  const [cleaningCost, setCleaningCost] = useState(initialCleaningCost);
  const [suppliesCost, setSuppliesCost] = useState(initialSuppliesCost);
  const [otaFeePercent, setOtaFeePercent] = useState(Math.round(initialOtaFeeRate * 100));
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
        otaFeeRate: otaFeePercent / 100,
        otherCost,
        initialCost,
      }),
    [
      rent,
      managementFee,
      nightlyPrice,
      occupancyPercent,
      utilityCost,
      cleaningCost,
      suppliesCost,
      otaFeePercent,
      otherCost,
      initialCost,
    ],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">収益シミュレーション</h2>
      <p className="mt-1 text-xs text-slate-400">
        数値は自由に変更できます。変更するとその場で再計算されます。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField label="家賃" value={rent} onChange={setRent} suffix="円/月" />
        <NumberField
          label="想定宿泊単価"
          value={nightlyPrice}
          onChange={setNightlyPrice}
          suffix="円/泊"
          step={500}
        />
        <NumberField
          label="想定稼働率"
          value={occupancyPercent}
          onChange={setOccupancyPercent}
          suffix="%"
          step={5}
          min={0}
          max={100}
        />
        <NumberField
          label="OTA手数料率"
          value={otaFeePercent}
          onChange={setOtaFeePercent}
          suffix="%"
          step={1}
          min={0}
          max={100}
        />
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
            <dt className="text-slate-400">OTA手数料</dt>
            <dd className="font-semibold text-slate-800">{formatYen(result.otaFee)}</dd>
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

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">想定利益（月額）</p>
            <p
              className={`text-3xl font-extrabold ${result.monthlyProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {result.monthlyProfit >= 0 ? "+" : ""}
              {formatYen(result.monthlyProfit)}
              <span className="ml-1 text-base font-medium text-slate-400">/月</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">想定利益（年額）</p>
            <p
              className={`text-3xl font-extrabold ${result.annualProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {result.annualProfit >= 0 ? "+" : ""}
              {formatYen(result.annualProfit)}
              <span className="ml-1 text-base font-medium text-slate-400">/年</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
          <div>
            <dt className="text-slate-400">初期費用</dt>
            <dd className="font-semibold text-slate-800">
              {initialCost ? formatYen(initialCost) : "未登録"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">想定利回り（年間）</dt>
            <dd className="font-semibold text-slate-800">
              {result.yieldRate === null ? "-" : formatPercent(result.yieldRate, 1)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-400">投資回収期間</dt>
            <dd className="font-semibold text-slate-800">
              {result.paybackMonths === null
                ? "算出不可（初期費用未登録、または赤字のため）"
                : formatPaybackPeriod(result.paybackMonths)}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}
