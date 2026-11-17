"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatYen, parseYen, todayJST } from "@/lib/format";
import { useSetStatus } from "@/lib/queries";
import type { Item, ItemStatus } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { STORE_OPTIONS } from "./item-form";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Field, Input, NativeSelect } from "./ui/input";

/** 未購入 → 購入済み の確認ダイアログ（購入日・実際の金額・購入先） */
export function PurchaseDialog({ item, open, onOpenChange, initialStatus = "purchased" }: { item: Item; open: boolean; onOpenChange: (o: boolean) => void; initialStatus?: ItemStatus }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="購入済みに変更" description={item.name}>
        {/* ダイアログを開くたびに初期値から作り直す */}
        {open ? <PurchaseForm item={item} initialStatus={initialStatus} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PurchaseForm({ item, initialStatus, onDone }: { item: Item; initialStatus: ItemStatus; onDone: () => void }) {
  const setStatus = useSetStatus();
  const [price, setPrice] = useState(() => String(item.actual_unit_price ?? item.planned_unit_price ?? ""));
  const [date, setDate] = useState(() => item.purchase_date ?? todayJST());
  const [store, setStore] = useState(() => item.purchase_store ?? item.store ?? "");
  const [status, setStatusValue] = useState<ItemStatus>(initialStatus);

  const unit = parseYen(price);
  const total = unit === null ? null : unit * item.quantity + item.shipping_fee;

  const submit = () => {
    if (price.trim() && unit === null) {
      toast.error("金額は数字で入力してください");
      return;
    }
    const vars = {
      id: item.id,
      patch: { status, actual_unit_price: unit, purchase_date: date || null, purchase_store: store.trim() || null },
    };
    // 楽観的更新でカードが切り替わりダイアログが閉じても結果を通知できるよう mutateAsync を使用
    const run = async () => {
      try {
        await setStatus.mutateAsync(vars);
        toast.success(`「${item.name}」を購入済みにしました`);
        onDone();
      } catch (e) {
        toast.error(`保存に失敗しました: ${errorMessage(e)}`, { action: { label: "再試行", onClick: () => void run() } });
      }
    };
    void run();
  };

  return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="実際の購入単価（円）" htmlFor="pd-price">
              <Input id="pd-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus={false} />
            </Field>
            <Field label="購入日" htmlFor="pd-date">
              <Input id="pd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="購入先" htmlFor="pd-store">
            <Input id="pd-store" list="pd-stores" value={store} onChange={(e) => setStore(e.target.value)} />
            <datalist id="pd-stores">{STORE_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="ステータス" htmlFor="pd-status">
            <NativeSelect id="pd-status" value={status} onChange={(e) => setStatusValue(e.target.value as ItemStatus)}>
              <option value="purchased">購入済み</option>
              <option value="ordered">注文済み</option>
              <option value="shipping">配送中</option>
              <option value="installed">設置完了</option>
            </NativeSelect>
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {item.quantity}点{item.shipping_fee ? `＋送料${formatYen(item.shipping_fee)}` : ""}
              {item.planned_unit_price !== null ? `（予定 ${formatYen(item.planned_unit_price)}）` : ""}
            </span>
            <span className="text-base font-semibold tabular">{formatYen(total)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={submit} disabled={setStatus.isPending}>
            {setStatus.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            購入済みとして保存
          </Button>
        </div>
  );
}
