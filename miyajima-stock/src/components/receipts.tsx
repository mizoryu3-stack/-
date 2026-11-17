"use client";

import { ExternalLink, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { formatDate, formatYen } from "@/lib/format";
import { toUploadable } from "@/lib/image";
import { useAddReceipt, useDeleteReceipt, useReceipts } from "@/lib/queries";
import { getSignedUrl, uploadFile } from "@/lib/storage";
import type { Receipt } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { ItemImage } from "./item-image";
import { Button } from "./ui/button";

/**
 * 領収書・レシートの管理（複数枚）。
 * 経費整理の資料として、購入日・購入先・金額を一緒に記録します（税務判定は行いません）。
 */
export function ReceiptManager({
  itemId, expenseId, defaults,
}: {
  itemId?: string;
  expenseId?: string;
  defaults: { purchase_date: string | null; store: string | null; amount: number | null };
}) {
  const receipts = useReceipts({ itemId, expenseId });
  const add = useAddReceipt();
  const del = useDeleteReceipt();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [target, setTarget] = useState<Receipt | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const blob = await toUploadable(file, 2400, 0.9);
        const path = await uploadFile(blob, "receipts");
        await add.mutateAsync({
          item_id: itemId ?? null,
          expense_id: expenseId ?? null,
          file_path: path,
          file_name: file.name,
          purchase_date: defaults.purchase_date,
          store: defaults.store,
          amount: defaults.amount,
          notes: null,
        });
        ok += 1;
      } catch (e) {
        toast.error(`「${file.name}」の保存に失敗しました: ${errorMessage(e)}`);
      }
    }
    setUploading(false);
    if (ok) toast.success(`領収書を${ok}件保存しました`);
  };

  const open = async (r: Receipt) => {
    try {
      window.open(await getSignedUrl(r.file_path), "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-3">
      {receipts.data?.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {receipts.data.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-xl border bg-card">
              <button type="button" onClick={() => open(r)} className="block w-full">
                {r.file_path.endsWith(".pdf") ? (
                  <div className="flex aspect-[3/4] items-center justify-center bg-muted"><FileText className="size-8 text-muted-foreground" /></div>
                ) : (
                  <ItemImage path={r.file_path} alt="領収書" className="aspect-[3/4] w-full" />
                )}
              </button>
              <div className="flex items-start justify-between gap-1 p-2 text-[11px]">
                <div className="min-w-0 text-muted-foreground">
                  <p className="truncate">{formatDate(r.purchase_date)}</p>
                  <p className="truncate">{r.store ?? "—"} ・ {formatYen(r.amount)}</p>
                </div>
                <div className="flex shrink-0">
                  <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => open(r)} aria-label="開く"><ExternalLink className="size-3.5" /></button>
                  <button type="button" className="rounded p-1 text-destructive hover:bg-muted" onClick={() => setTarget(r)} aria-label="削除"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : receipts.isLoading ? null : (
        <p className="text-sm text-muted-foreground">領収書・レシートはまだありません</p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />} 領収書を添付（複数可）
      </Button>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <p className="text-[11px] text-muted-foreground">※ 資料整理のための機能です。税務上の経費判定や会計処理は行いません。</p>
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => !o && setTarget(null)}
        title="領収書を削除しますか？"
        description="この操作は取り消せません。"
        pending={del.isPending}
        onConfirm={() => target && del.mutate(target, { onSuccess: () => { setTarget(null); toast.success("削除しました"); }, onError: (e) => toast.error(errorMessage(e)) })}
      />
    </div>
  );
}
