"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { BudgetEditor } from "@/components/budget-editor";
import { CategoryChart, MonthlyChart, RankingBars } from "@/components/charts";
import { ErrorState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  breakdownByCategory, effectiveTotal, monthlyPurchases, spendingByStore, summarizeBudget, summarizeExpenses, summarizeItems,
} from "@/lib/calc";
import { formatYen } from "@/lib/format";
import { useCategories, useExpenses, useItems, useSettings } from "@/lib/queries";
import { STATUS_GROUP, STATUS_LABEL } from "@/lib/status";

function Line({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-2 text-sm ${strong ? "border-t pt-3 font-semibold" : ""}`}>
      <span className={muted ? "text-muted-foreground" : undefined}>{label}</span>
      <span className={`tabular ${value < 0 ? "text-destructive" : ""}`}>{formatYen(value)}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const items = useItems();
  const categories = useCategories();
  const expenses = useExpenses();
  const settings = useSettings();

  const data = useMemo(() => {
    const list = items.data ?? [];
    const s = summarizeItems(list);
    const e = summarizeExpenses(expenses.data ?? []);
    const b = summarizeBudget(settings.data?.total_budget ?? 3800000, s, e);
    const top = list
      .filter((i) => STATUS_GROUP[i.status] !== "excluded")
      .map((i) => ({ i, total: effectiveTotal(i) }))
      .sort((a, b2) => b2.total - a.total)
      .slice(0, 10);
    return { s, e, b, top, cats: breakdownByCategory(list, categories.data ?? []), monthly: monthlyPurchases(list), stores: spendingByStore(list) };
  }, [items.data, expenses.data, settings.data, categories.data]);

  const err = items.error ?? expenses.error ?? settings.error;
  if (err) return <ErrorState error={err} onRetry={() => { items.refetch(); expenses.refetch(); settings.refetch(); }} />;
  if (items.isLoading || settings.isLoading) return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;

  const { s, e, b } = data;
  const plannedRate = b.budget > 0 ? ((b.spent + b.planned) / b.budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="支出分析・予算" description="民泊開業に必要な総投資額を把握します" actions={<Button asChild variant="outline" size="sm"><Link href="/expenses"><Receipt /> その他費用</Link></Button>} />

      <Card>
        <CardHeader>
          <CardDescription>総予算</CardDescription>
          <BudgetEditor budget={b.budget} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`使用済み${b.spentRate.toFixed(1)}%、予定込み${plannedRate.toFixed(1)}%`}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-chart-2/70" style={{ width: `${Math.min(100, plannedRate)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-chart-1" style={{ width: `${Math.min(100, b.spentRate)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-[12px] text-muted-foreground tabular">
              <span><span className="mr-1 inline-block size-2 rounded-full bg-chart-1" />使用済み {b.spentRate.toFixed(1)}%</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-chart-2/70" />予定込み {plannedRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="grid gap-x-10 md:grid-cols-2">
            <div>
              <Line label="確定支出（使用済み）" value={b.spent} />
              <Line label="　商品購入（購入確定）" value={s.purchased.amount} muted />
              <Line label="　その他費用（実績）" value={e.confirmed} muted />
              <Line label="予算残り" value={b.remaining} strong />
            </div>
            <div>
              <Line label="今後の予定" value={b.planned} />
              <Line label="　商品（未購入予定）" value={s.pending.amount} muted />
              <Line label="　その他費用（見積）" value={e.estimated} muted />
              <Line label="予定を含めた予算残り" value={b.remainingAfterPlanned} strong />
            </div>
          </div>
          {b.remainingAfterPlanned < 0 ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">予定を含めると予算を {formatYen(-b.remainingAfterPlanned)} 超過します。</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-[12px] text-muted-foreground">購入済み総額（商品）</p><p className="mt-1 text-2xl font-semibold tabular">{formatYen(s.purchased.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-[12px] text-muted-foreground">未購入予定総額（商品）</p><p className="mt-1 text-2xl font-semibold tabular">{formatYen(s.pending.amount)}</p></CardContent></Card>
        <Card className="border-transparent bg-primary text-primary-foreground"><CardContent className="p-5"><p className="text-[12px] text-primary-foreground/80">全体必要金額（商品＋その他費用）</p><p className="mt-1 text-2xl font-semibold tabular">{formatYen(s.all.amount + e.total)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>カテゴリー別支出</CardTitle></CardHeader>
          <CardContent><CategoryChart data={data.cats} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>月別購入金額</CardTitle><CardDescription>購入確定した商品を購入日で集計（日本時間）</CardDescription></CardHeader>
          <CardContent><MonthlyChart data={data.monthly} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>購入先別支出</CardTitle></CardHeader>
          <CardContent><RankingBars rows={data.stores.slice(0, 10).map((r) => ({ label: r.store, value: r.amount, sub: `${r.count}件` }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>高額商品ランキング</CardTitle></CardHeader>
          <CardContent>
            <ol className="divide-y">
              {data.top.map(({ i, total }, idx) => (
                <li key={i.id}>
                  <Link href={`/items/${i.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-5 text-center text-xs text-muted-foreground tabular">{idx + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{i.name}</span>
                    <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[i.status]}</span>
                    <span className="font-medium tabular">{formatYen(total)}</span>
                  </Link>
                </li>
              ))}
              {!data.top.length ? <p className="py-6 text-center text-sm text-muted-foreground">データがありません</p> : null}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>集計ルール</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-[13px] text-muted-foreground">
          <p>・購入確定（購入済み金額に計上）: 注文済み・配送中・購入済み・設置完了。金額は「実際の購入単価（未入力なら予定単価）×数量＋送料」。</p>
          <p>・未購入予定（予定金額に計上）: 検討中・未購入。金額は「予定単価×数量＋送料」。</p>
          <p>・購入取り消しは集計に含めません。1つの商品は必ず1つの区分にだけ属するため、二重計上されません。</p>
          <p>・その他費用は商品と区別し、見積（未確定）と実績（確定）で分けて計上します。</p>
        </CardContent>
      </Card>
    </div>
  );
}
