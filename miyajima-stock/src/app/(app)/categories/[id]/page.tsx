"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { ItemCard } from "@/components/item-card";
import { EmptyState, ErrorState } from "@/components/query-state";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeItems } from "@/lib/calc";
import { formatYen } from "@/lib/format";
import { useCategories, useItems } from "@/lib/queries";
import { CategoryEditor } from "@/components/category-editor";

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const categories = useCategories();
  const items = useItems();
  const [edit, setEdit] = useState(0);
  const category = categories.data?.find((c) => c.id === id);
  const list = useMemo(() => (items.data ?? []).filter((i) => i.category_ids.includes(id)), [items.data, id]);
  const s = useMemo(() => summarizeItems(list), [list]);

  if (categories.error || items.error) return <ErrorState error={categories.error ?? items.error} onRetry={() => { categories.refetch(); items.refetch(); }} />;
  if (categories.isLoading || items.isLoading) return <Skeleton className="h-64" />;
  if (!category) return <EmptyState title="カテゴリーが見つかりません" action={<Button asChild variant="outline"><Link href="/categories">カテゴリー一覧へ</Link></Button>} />;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/categories"><ArrowLeft /> カテゴリー一覧</Link></Button>
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: category.color }}>
          <CategoryIcon icon={category.icon} className="size-6" />
        </span>
        <h1 className="font-serif text-2xl font-semibold">{category.name}</h1>
        <Button variant="ghost" size="icon" onClick={() => setEdit(Date.now())} aria-label="編集"><Pencil /></Button>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard tone="primary" label="購入済み" value={formatYen(s.purchased.amount)} sub={`${s.purchased.count}件`} />
        <StatCard tone="accent" label="未購入予定" value={formatYen(s.pending.amount)} sub={`${s.pending.count}件`} />
        <StatCard label="合計" value={formatYen(s.all.amount)} sub={`${s.all.count}件`} />
      </div>
      {list.length ? (
        <div className="grid gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {list.map((it) => <ItemCard key={it.id} item={it} categories={categories.data ?? []} />)}
        </div>
      ) : (
        <EmptyState title="このカテゴリーの商品はまだありません" action={<Button asChild><Link href="/add">商品を追加</Link></Button>} />
      )}
      {edit ? <CategoryEditor key={edit} open onOpenChange={(o) => !o && setEdit(0)} category={category} /> : null}
    </div>
  );
}
