"use client";

import { Check, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { effectiveTotal, effectiveUnitPrice } from "@/lib/calc";
import { formatYen } from "@/lib/format";
import { useSetStatus } from "@/lib/queries";
import { STATUS_GROUP } from "@/lib/status";
import type { Category, ItemWithCategories } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { CategoryChip } from "./category-icon";
import { ItemImage } from "./item-image";
import { PurchaseDialog } from "./purchase-dialog";
import { StatusBadge } from "./status-badge";

export function QuickStatusButton({ item, className }: { item: ItemWithCategories; className?: string }) {
  const [open, setOpen] = useState(false);
  const setStatus = useSetStatus();
  const group = STATUS_GROUP[item.status];
  if (group === "excluded") return null;
  if (group === "pending") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={`inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground shadow-sm active:scale-95 ${className ?? ""}`}
        >
          <Check className="size-3.5" /> 購入済みに
        </button>
        {/* ダイアログ内の操作がカードのリンクに伝わらないようにする（Portal でも React のイベントは親へ伝播するため） */}
        <span className="contents" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <PurchaseDialog item={item} open={open} onOpenChange={setOpen} />
        </span>
      </>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const run = async () => {
          try {
            await setStatus.mutateAsync({ id: item.id, patch: { status: "planned" } });
            toast.success("未購入に戻しました");
          } catch (err) {
            toast.error(`保存に失敗しました: ${errorMessage(err)}`, { action: { label: "再試行", onClick: () => void run() } });
          }
        };
        void run();
      }}
      className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[12px] text-muted-foreground active:scale-95 ${className ?? ""}`}
    >
      <Undo2 className="size-3.5" /> 未購入に戻す
    </button>
  );
}

export function ItemCard({ item, categories }: { item: ItemWithCategories; categories: Category[] }) {
  const cats = item.category_ids.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => Boolean(c));
  const unit = effectiveUnitPrice(item);
  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md md:flex-col md:p-0"
    >
      <ItemImage path={item.image_path ?? item.screenshot_path} alt={item.name} className="size-24 shrink-0 rounded-lg md:aspect-[4/3] md:size-auto md:w-full md:rounded-b-none md:rounded-t-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:p-4 md:pt-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.name}</p>
          <StatusBadge status={item.status} className="shrink-0" />
        </div>
        <div className="text-[12px] text-muted-foreground tabular">
          {formatYen(unit)} × {item.quantity}
          {item.shipping_fee ? ` ＋送料${formatYen(item.shipping_fee)}` : ""}
          {item.store ? ` ・ ${item.store}` : ""}
        </div>
        <div className="flex flex-wrap gap-1">
          {cats.slice(0, 3).map((c) => <CategoryChip key={c.id} name={c.name} color={c.color} icon={c.icon} small />)}
          {cats.length > 3 ? <span className="text-[11px] text-muted-foreground">+{cats.length - 3}</span> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-lg font-semibold tabular">{unit === null ? <span className="text-sm text-muted-foreground">金額未入力</span> : formatYen(effectiveTotal(item))}</span>
          <QuickStatusButton item={item} />
        </div>
      </div>
    </Link>
  );
}
