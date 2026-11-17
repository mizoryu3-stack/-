"use client";

import { Download, LayoutGrid, PackageSearch, Plus, Rows3, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app-shell";
import { CategoryChip } from "@/components/category-icon";
import { ItemCard, QuickStatusButton } from "@/components/item-card";
import { ItemImage } from "@/components/item-image";
import { EmptyState, ErrorState } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { effectiveTotal, effectiveUnitPrice, summarizeItems } from "@/lib/calc";
import { exportItemsCsv } from "@/lib/export";
import { formatDate, formatYen } from "@/lib/format";
import { useCategories, useItems } from "@/lib/queries";
import { STATUS_GROUP, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { ItemWithCategories } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = {
  created_desc: "登録日（新しい順）",
  created_asc: "登録日（古い順）",
  total_desc: "金額の高い順",
  total_asc: "金額の安い順",
  unit_desc: "単価の高い順",
  unit_asc: "単価の安い順",
  purchase_desc: "購入日（新しい順）",
  purchase_asc: "購入日（古い順）",
  name: "商品名順",
  store: "販売サイト順",
} as const;
type SortKey = keyof typeof SORTS;

function sortItems(list: ItemWithCategories[], sort: SortKey) {
  const arr = [...list];
  const num = (v: number | null) => v ?? -1;
  switch (sort) {
    case "created_asc": return arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "total_desc": return arr.sort((a, b) => effectiveTotal(b) - effectiveTotal(a));
    case "total_asc": return arr.sort((a, b) => effectiveTotal(a) - effectiveTotal(b));
    case "unit_desc": return arr.sort((a, b) => num(effectiveUnitPrice(b)) - num(effectiveUnitPrice(a)));
    case "unit_asc": return arr.sort((a, b) => num(effectiveUnitPrice(a)) - num(effectiveUnitPrice(b)));
    case "purchase_desc": return arr.sort((a, b) => (b.purchase_date ?? "").localeCompare(a.purchase_date ?? ""));
    case "purchase_asc": return arr.sort((a, b) => (a.purchase_date ?? "9999").localeCompare(b.purchase_date ?? "9999"));
    case "name": return arr.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    case "store": return arr.sort((a, b) => (a.store ?? "￮").localeCompare(b.store ?? "￮", "ja"));
    default: return arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/* 表示形式（グリッド/表）を端末ごとに記憶 */
const VIEW_KEY = "ms-items-view";
const viewListeners = new Set<() => void>();
let memoryView: "grid" | "table" = "grid";
function readView(): "grid" | "table" {
  try {
    return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid";
  } catch {
    return memoryView;
  }
}
function writeView(v: "grid" | "table") {
  memoryView = v;
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* 保存できなくても表示切替は動作 */
  }
  viewListeners.forEach((l) => l());
}
function subscribeView(l: () => void) {
  viewListeners.add(l);
  return () => viewListeners.delete(l);
}

export function ItemsView() {
  const items = useItems();
  const categories = useCategories();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = params.get("status") ?? "all";
  const category = params.get("category") ?? "all";
  const store = params.get("store") ?? "all";
  const sort = (params.get("sort") as SortKey) ?? "created_desc";
  const [q, setQ] = useState(params.get("q") ?? "");
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as const);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    if (!value || value === "all" || (key === "sort" && value === "created_desc")) p.delete(key);
    else p.set(key, value);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const stores = useMemo(() => [...new Set((items.data ?? []).map((i) => i.store).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "ja")), [items.data]);

  const filtered = useMemo(() => {
    let list = items.data ?? [];
    const query = q.trim().normalize("NFKC").toLowerCase();
    if (query) {
      list = list.filter((i) =>
        [i.name, i.original_name, i.brand, i.model_number, i.item_type, i.notes, i.store].some((v) => v?.normalize("NFKC").toLowerCase().includes(query)),
      );
    }
    if (status === "purchased" || status === "pending" || status === "excluded") list = list.filter((i) => STATUS_GROUP[i.status] === status);
    else if (status !== "all") list = list.filter((i) => i.status === status);
    if (category === "none") list = list.filter((i) => i.category_ids.length === 0);
    else if (category !== "all") list = list.filter((i) => i.category_ids.includes(category));
    if (store !== "all") list = list.filter((i) => (i.store ?? "") === store);
    return sortItems(list, sort);
  }, [items.data, q, status, category, store, sort]);

  const s = useMemo(() => summarizeItems(filtered), [filtered]);
  const cats = categories.data ?? [];
  const filtering = q || status !== "all" || category !== "all" || store !== "all";

  if (items.error) return <ErrorState error={items.error} onRetry={() => items.refetch()} />;

  return (
    <div>
      <PageHeader
        title="商品一覧"
        description={items.data ? `${filtered.length}件 ・ 購入済み ${formatYen(s.purchased.amount)} ・ 未購入予定 ${formatYen(s.pending.amount)}` : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportItemsCsv(filtered, cats)} disabled={!filtered.length}>
              <Download /> CSV
            </Button>
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href="/add"><Plus /> 商品を追加</Link>
            </Button>
          </>
        }
      />

      <div className="sticky top-14 z-20 -mx-4 mb-4 space-y-2 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setParam("q", e.target.value);
            }}
            placeholder="商品名・メーカー・型番で検索"
            className="pl-10"
            aria-label="商品を検索"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[
            ["all", "すべて"],
            ["pending", "未購入"],
            ["purchased", "購入済み"],
          ].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setParam("status", v)} className={cn("h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium", status === v ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
              {l}
            </button>
          ))}
          <NativeSelect aria-label="ステータス" value={["all", "pending", "purchased"].includes(status) ? "" : status} onChange={(e) => setParam("status", e.target.value || "all")} className="h-9 w-auto shrink-0 rounded-full text-[13px]">
            <option value="">詳細ステータス</option>
            {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
            <option value="excluded">集計対象外（取消）</option>
          </NativeSelect>
          <NativeSelect aria-label="カテゴリー" value={category} onChange={(e) => setParam("category", e.target.value)} className="h-9 w-auto shrink-0 rounded-full text-[13px]">
            <option value="all">全カテゴリー</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">未分類</option>
          </NativeSelect>
          <NativeSelect aria-label="販売サイト" value={store} onChange={(e) => setParam("store", e.target.value)} className="h-9 w-auto shrink-0 rounded-full text-[13px]">
            <option value="all">全販売サイト</option>
            {stores.map((st) => <option key={st} value={st}>{st}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="並び替え" value={sort} onChange={(e) => setParam("sort", e.target.value)} className="h-9 w-auto shrink-0 rounded-full text-[13px]">
            {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </NativeSelect>
          {filtering ? (
            <button type="button" onClick={() => { setQ(""); router.replace(pathname); }} className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] text-muted-foreground">
              <X className="size-3.5" /> 解除
            </button>
          ) : null}
          <div className="ml-auto hidden shrink-0 gap-1 rounded-full border bg-card p-1 md:flex">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-label={v === "grid" ? "グリッド表示" : "表形式"}
                onClick={() => {
                  writeView(v);
                }}
                className={cn("rounded-full p-1.5", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {v === "grid" ? <LayoutGrid className="size-4" /> : <Rows3 className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.isLoading ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 md:h-72" />)}</div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<PackageSearch className="size-8" />}
          title={filtering ? "条件に一致する商品がありません" : "まだ商品が登録されていません"}
          description={filtering ? "検索条件を変更してください" : "スクリーンショットをアップロードするだけで、AIが商品情報を読み取ります"}
          action={!filtering ? <Button asChild><Link href="/add"><Plus /> 商品を追加</Link></Button> : undefined}
        />
      ) : (
        <>
          <div className={cn("grid gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4", view === "table" && "md:hidden")}>
            {filtered.map((it) => <ItemCard key={it.id} item={it} categories={cats} />)}
          </div>
          {view === "table" ? (
            <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">商品</th>
                    <th className="px-3 py-2.5 font-medium">カテゴリー</th>
                    <th className="px-3 py-2.5 font-medium">販売サイト</th>
                    <th className="px-3 py-2.5 text-right font-medium">単価</th>
                    <th className="px-3 py-2.5 text-right font-medium">数量</th>
                    <th className="px-3 py-2.5 text-right font-medium">合計</th>
                    <th className="px-3 py-2.5 font-medium">状況</th>
                    <th className="px-3 py-2.5 font-medium">購入日</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => router.push(`/items/${it.id}`)}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <ItemImage path={it.image_path ?? it.screenshot_path} alt={it.name} className="size-10 shrink-0 rounded-md" />
                          <span className="line-clamp-2 font-medium">{it.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {it.category_ids.map((id) => cats.find((c) => c.id === id)).filter(Boolean).map((c) => <CategoryChip key={c!.id} name={c!.name} color={c!.color} icon={c!.icon} small />)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{it.store ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular">{formatYen(effectiveUnitPrice(it))}</td>
                      <td className="px-3 py-2 text-right tabular">{it.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular">{formatYen(effectiveTotal(it))}</td>
                      <td className="px-3 py-2"><StatusBadge status={it.status} /></td>
                      <td className="px-3 py-2 text-muted-foreground tabular">{it.purchase_date ? formatDate(it.purchase_date) : "—"}</td>
                      <td className="px-3 py-2"><QuickStatusButton item={it} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
