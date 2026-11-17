"use client";

import { ArrowDown, ArrowUp, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { CategoryEditor } from "@/components/category-editor";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { breakdownByCategory } from "@/lib/calc";
import { formatYen } from "@/lib/format";
import { useCategories, useDeleteCategory, useItems, useReorderCategories } from "@/lib/queries";
import type { Category } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

export default function CategoriesPage() {
  const categories = useCategories();
  const items = useItems();
  const del = useDeleteCategory();
  const reorder = useReorderCategories();
  const [editing, setEditing] = useState<{ open: boolean; category: Category | null; key: number }>({ open: false, category: null, key: 0 });
  const [deleting, setDeleting] = useState<Category | null>(null);

  const stats = useMemo(() => new Map(breakdownByCategory(items.data ?? [], categories.data ?? []).map((b) => [b.id, b])), [items.data, categories.data]);
  const uncategorized = stats.get(null);

  if (categories.error) return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;
  const list = categories.data ?? [];

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...list];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    reorder.mutate(next, { onError: (e) => toast.error(errorMessage(e)) });
  };

  return (
    <div>
      <PageHeader
        title="カテゴリー"
        description="部屋別・用途別に商品を整理します。1つの商品に複数のカテゴリーを付けられます。"
        actions={<Button size="sm" onClick={() => setEditing({ open: true, category: null, key: Date.now() })}><Plus /> 追加</Button>}
      />
      {categories.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((c, idx) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-xl border bg-card p-2 pr-1">
                <Link href={`/categories/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                    <CategoryIcon icon={c.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block text-[12px] text-muted-foreground tabular">
                      {s?.count ?? 0}件 ・ 購入済み {formatYen(s?.purchased ?? 0)} ・ 予定 {formatYen(s?.pending ?? 0)}
                    </span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </Link>
                <div className="flex shrink-0 flex-col">
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="上へ"><ArrowUp className="size-3.5" /></button>
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} aria-label="下へ"><ArrowDown className="size-3.5" /></button>
                </div>
                <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" onClick={() => setEditing({ open: true, category: c, key: Date.now() })} aria-label="編集"><Pencil className="size-4" /></button>
                <button type="button" className="rounded-lg p-2 text-destructive hover:bg-muted" onClick={() => setDeleting(c)} aria-label="削除"><Trash2 className="size-4" /></button>
              </li>
            );
          })}
          {uncategorized ? (
            <li className="rounded-xl border border-dashed bg-card/60 p-2">
              <Link href="/items?category=none" className="flex items-center gap-3 p-1.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CategoryIcon icon="tag" className="size-5" /></span>
                <span>
                  <span className="block font-medium">未分類</span>
                  <span className="block text-[12px] text-muted-foreground tabular">{uncategorized.count}件 ・ {formatYen(uncategorized.purchased + uncategorized.pending)}</span>
                </span>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
            </li>
          ) : null}
        </ul>
      )}

      <CategoryEditor key={editing.key} open={editing.open} onOpenChange={(o) => setEditing((e) => ({ ...e, open: o }))} category={editing.category} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`「${deleting?.name ?? ""}」を削除しますか？`}
        description="カテゴリーのみ削除され、商品そのものは削除されません（他のカテゴリーや未分類として残ります）。"
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => { toast.success("削除しました"); setDeleting(null); }, onError: (e) => toast.error(errorMessage(e)) })}
      />
    </div>
  );
}
