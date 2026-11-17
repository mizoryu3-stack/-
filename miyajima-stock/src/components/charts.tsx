"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryBreakdown } from "@/lib/calc";
import { formatMonth, formatYen, formatYenShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular">
          <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium">{formatYen(p.value)}</span>
        </p>
      ))}
      {payload.length > 1 ? <p className="mt-1 border-t pt-1 text-right font-semibold tabular">計 {formatYen(total)}</p> : null}
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-chart-1" />購入済み</span>
      <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-chart-2" />未購入予定</span>
    </div>
  );
}

/** カテゴリー別（購入済み＋未購入予定の積み上げ横棒） */
export function CategoryChart({ data, limit }: { data: CategoryBreakdown[]; limit?: number }) {
  const [table, setTable] = useState(false);
  const rows = data
    .filter((d) => d.purchased + d.pending > 0)
    .sort((a, b) => b.purchased + b.pending - (a.purchased + a.pending))
    .slice(0, limit ?? 99);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">金額が入力された商品がまだありません</p>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <ChartLegend />
        <button type="button" className="text-xs text-primary" onClick={() => setTable((t) => !t)}>{table ? "グラフで見る" : "表で見る"}</button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">カテゴリー</th><th className="py-1 text-right font-medium">購入済み</th><th className="py-1 text-right font-medium">未購入予定</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id ?? "none"} className="border-t"><td className="py-2">{r.name}</td><td className="py-2 text-right tabular">{formatYen(r.purchased)}</td><td className="py-2 text-right tabular">{formatYen(r.pending)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ height: Math.max(160, rows.length * 38 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }} barCategoryGap={10}>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" tick={axisTick} tickFormatter={formatYenShort} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ ...axisTick, fill: "var(--foreground)", fontSize: 12 }} width={72} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <Bar dataKey="purchased" name="購入済み" stackId="a" maxBarSize={26} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
              <Bar dataKey="pending" name="未購入予定" stackId="a" maxBarSize={26} fill="var(--chart-2)" stroke="var(--card)" strokeWidth={2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** 月別購入金額 */
export function MonthlyChart({ data }: { data: { month: string; amount: number }[] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-muted-foreground">購入済みの商品がまだありません</p>;
  const rows = data.map((d) => ({ ...d, label: d.month === "日付未設定" ? "日付未設定" : formatMonth(d.month).replace(/^\d{4}年/, (y) => (data.length > 12 ? y.slice(2) : "")) }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} tickFormatter={formatYenShort} axisLine={false} tickLine={false} width={60} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="amount" name="購入金額" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 横棒のシンプルなランキング（購入先別など） */
export function RankingBars({ rows, className }: { rows: { label: string; value: number; sub?: string; href?: string }[]; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">データがありません</p>;
  return (
    <ol className={cn("space-y-3", className)}>
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate"><span className="mr-2 text-xs text-muted-foreground tabular">{i + 1}</span>{r.label}{r.sub ? <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span> : null}</span>
            <span className="shrink-0 font-medium tabular">{formatYen(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
