"use client";

import { BarChart3, CheckCircle2, CircleDashed, FolderTree, Layers, List, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { CategoryChart } from "@/components/charts";
import { ItemImage } from "@/components/item-image";
import { ErrorState } from "@/components/query-state";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { breakdownByCategory, effectiveTotal, summarizeBudget, summarizeExpenses, summarizeItems } from "@/lib/calc";
import { formatNumber, formatYen } from "@/lib/format";
import { useCategories, useExpenses, useItems, useSettings } from "@/lib/queries";

export default function DashboardPage() {
  const items = useItems();
  const categories = useCategories();
  const settings = useSettings();
  const expenses = useExpenses();

  const summary = useMemo(() => summarizeItems(items.data ?? []), [items.data]);
  const breakdown = useMemo(() => breakdownByCategory(items.data ?? [], categories.data ?? []), [items.data, categories.data]);
  const budget = useMemo(
    () => summarizeBudget(settings.data?.total_budget ?? 3800000, summary, summarizeExpenses(expenses.data ?? [])),
    [settings.data, summary, expenses.data],
  );

  if (items.error) return <ErrorState error={items.error} onRetry={() => items.refetch()} />;
  const loading = items.isLoading || categories.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="ダッシュボード" description="宮島民泊の購入状況と予算の概要" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              href="/items?status=purchased"
              tone="primary"
              icon={<CheckCircle2 className="size-4" />}
              label="購入済み"
              value={formatYen(summary.purchased.amount)}
              sub={`${formatNumber(summary.purchased.count)}件 ・ 数量${formatNumber(summary.purchased.quantity)}点`}
            />
            <StatCard
              href="/items?status=pending"
              tone="accent"
              icon={<CircleDashed className="size-4" />}
              label="未購入（予定）"
              value={formatYen(summary.pending.amount)}
              sub={`${formatNumber(summary.pending.count)}件 ・ 数量${formatNumber(summary.pending.quantity)}点`}
            />
            <StatCard
              href="/items"
              icon={<Layers className="size-4" />}
              label="全商品（予定＋実績）"
              value={formatYen(summary.all.amount)}
              sub={`${formatNumber(summary.all.count)}件 ・ 数量${formatNumber(summary.all.quantity)}点${summary.excluded.count ? `（取消${summary.excluded.count}件除く）` : ""}`}
            />
            <StatCard
              href="/analytics"
              icon={<Wallet className="size-4" />}
              label="予算残り"
              value={<span className={budget.remaining < 0 ? "text-destructive" : undefined}>{formatYen(budget.remaining)}</span>}
              sub={`予算 ${formatYen(budget.budget)}`}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>購入進捗</CardTitle>
              <span className="font-serif text-2xl font-semibold text-primary tabular">{summary.progressRate.toFixed(1)}%</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={summary.progressRate} label="購入進捗率" className="h-3" />
              <div className="flex flex-wrap justify-between gap-2 text-[13px] tabular">
                <span><span className="mr-1.5 inline-block size-2 rounded-full bg-chart-1" />購入済み {formatYen(summary.purchased.amount)}</span>
                <span><span className="mr-1.5 inline-block size-2 rounded-full bg-chart-2" />未購入予定 {formatYen(summary.pending.amount)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">購入進捗率 ＝ 購入済み金額 ÷（購入済み金額＋未購入予定金額）。注文済み・配送中・設置完了は購入済みに、検討中は未購入予定に含みます。</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {[
              { href: "/add", label: "商品を追加", icon: Plus, primary: true },
              { href: "/items?status=purchased", label: "購入済み", icon: CheckCircle2 },
              { href: "/items?status=pending", label: "未購入", icon: List },
              { href: "/categories", label: "カテゴリー", icon: FolderTree },
            ].map((a) => (
              <Link key={a.href} href={a.href} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-[11px] font-medium transition-shadow hover:shadow-md md:flex-row md:justify-center md:gap-2 md:text-sm ${a.primary ? "border-transparent bg-accent text-accent-foreground" : "bg-card"}`}>
                <a.icon className="size-5" />
                {a.label}
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>カテゴリー別支出</CardTitle>
                <Link href="/analytics" className="flex items-center gap-1 text-[13px] text-primary"><BarChart3 className="size-4" />支出分析</Link>
              </CardHeader>
              <CardContent>
                <CategoryChart data={breakdown} limit={8} />
                <p className="mt-2 text-[11px] text-muted-foreground">複数カテゴリーの商品は各カテゴリーに表示されます（全体合計には1回だけ計上）。</p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>最近登録した商品</CardTitle>
                <Link href="/items" className="text-[13px] text-primary">すべて見る</Link>
              </CardHeader>
              <CardContent>
                {items.data?.length ? (
                  <ul className="divide-y">
                    {items.data.slice(0, 6).map((it) => (
                      <li key={it.id}>
                        <Link href={`/items/${it.id}`} className="flex items-center gap-3 py-2.5">
                          <ItemImage path={it.image_path ?? it.screenshot_path} alt={it.name} className="size-12 shrink-0 rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{it.name}</p>
                            <p className="text-xs text-muted-foreground tabular">{formatYen(effectiveTotal(it))}</p>
                          </div>
                          <StatusBadge status={it.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-sm text-muted-foreground">まだ商品が登録されていません</p>
                    <Link href="/add" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">最初の商品を追加</Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
