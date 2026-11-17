"use client";

import { ArrowLeft, ExternalLink, History, Loader2, Pencil, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryChip } from "@/components/category-icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QuickStatusButton } from "@/components/item-card";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { ItemForm, valuesFromItem, valuesToInput, type ItemFormValues } from "@/components/item-form";
import { ItemImage } from "@/components/item-image";
import { ErrorState } from "@/components/query-state";
import { ReceiptManager } from "@/components/receipts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { actualTotal, effectiveTotal, plannedTotal } from "@/lib/calc";
import { formatDate, formatDateTime, formatYen } from "@/lib/format";
import { toUploadable } from "@/lib/image";
import { useCategories, useDeleteItem, useItem, useItemEvents, useSetStatus, useUpdateItem } from "@/lib/queries";
import { STATUS_GROUP, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import { removeFiles, uploadFile } from "@/lib/storage";
import type { ItemEvent, ItemStatus } from "@/lib/types";
import { errorMessage, isSafeHttpUrl } from "@/lib/utils";

function eventText(e: ItemEvent): string {
  const st = (v: string | null) => (v ? (STATUS_LABEL[v as ItemStatus] ?? v) : "—");
  const yen = (v: string | null) => (v ? formatYen(Number(v)) : "未入力");
  switch (e.event_type) {
    case "created": return `登録（${st(e.to_value)}）`;
    case "status_changed": return `購入状況: ${st(e.from_value)} → ${st(e.to_value)}`;
    case "planned_price_changed": return `予定単価: ${yen(e.from_value)} → ${yen(e.to_value)}`;
    case "actual_price_changed": return `購入単価: ${yen(e.from_value)} → ${yen(e.to_value)}`;
    case "quantity_changed": return `数量: ${e.from_value ?? "—"} → ${e.to_value ?? "—"}`;
    default: return e.event_type;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2.5 text-sm last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children ?? "—"}</dd>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading, error, refetch } = useItem(id);
  const categories = useCategories();
  const events = useItemEvents(id);
  const update = useUpdateItem();
  const setStatus = useSetStatus();
  const del = useDeleteItem();

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ItemFormValues | null>(null);
  const [newImage, setNewImage] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showShot, setShowShot] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<ItemStatus | null>(null);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-40" /></div>;
  if (!item) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">商品が見つかりませんでした（削除された可能性があります）</p>
        <Button asChild variant="outline"><Link href="/items">商品一覧へ</Link></Button>
      </div>
    );
  }

  const cats = item.category_ids.map((cid) => categories.data?.find((c) => c.id === cid)).filter(Boolean);
  const purchased = STATUS_GROUP[item.status] === "purchased";

  const startEdit = () => {
    setValues(valuesFromItem(item));
    setNewImage(null);
    setEditing(true);
  };

  const save = async () => {
    if (!values) return;
    const { input, error: vErr } = valuesToInput(values);
    if (vErr) return toast.error(vErr);
    setSaving(true);
    try {
      let image_path = item.image_path;
      if (newImage) image_path = await uploadFile(await toUploadable(newImage), "images");
      await update.mutateAsync({ id: item.id, patch: { ...input, image_path }, categoryIds: values.categoryIds });
      if (newImage && item.image_path && item.image_path !== item.screenshot_path) await removeFiles([item.image_path]).catch(() => undefined);
      toast.success("保存しました");
      setEditing(false);
    } catch (e) {
      // 入力内容は保持したまま再試行できる
      toast.error(`保存に失敗しました: ${errorMessage(e)}`, { action: { label: "再試行", onClick: () => save() } });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = (status: ItemStatus) => {
    // 未購入 → 購入確定系へ変更する場合は購入日・金額の確認画面を表示
    if (STATUS_GROUP[item.status] !== "purchased" && STATUS_GROUP[status] === "purchased") {
      setPurchaseStatus(status);
      return;
    }
    const patch: { status: ItemStatus; purchase_date?: string } = { status };
    const run = async () => {
      try {
        await setStatus.mutateAsync({ id: item.id, patch });
        toast.success(`購入状況を「${STATUS_LABEL[status]}」に変更しました`);
      } catch (e) {
        toast.error(`保存に失敗しました: ${errorMessage(e)}`, { action: { label: "再試行", onClick: () => void run() } });
      }
    };
    void run();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? router.back() : router.push("/items"))}>
          <ArrowLeft /> 戻る
        </Button>
        {!editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil /> 編集</Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 /> 削除</Button>
          </div>
        ) : null}
      </div>

      {editing && values ? (
        <Card>
          <CardHeader><CardTitle>商品を編集</CardTitle></CardHeader>
          <CardContent>
            <ItemForm values={values} onChange={setValues} categories={categories.data ?? []} image={{ path: item.image_path ?? item.screenshot_path, blob: newImage }} onImageChange={setNewImage} />
            <div className="sticky bottom-20 mt-6 flex gap-2 md:static">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>キャンセル</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}保存する</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="space-y-3">
              <ItemImage path={item.image_path ?? item.screenshot_path} alt={item.name} fit="contain" className="aspect-square w-full rounded-2xl border bg-card" />
              {item.screenshot_path ? (
                <button type="button" className="text-[13px] text-primary" onClick={() => setShowShot((s) => !s)}>
                  {showShot ? "元のスクリーンショットを閉じる" : "元のスクリーンショットを表示"}
                </button>
              ) : null}
              {showShot && item.screenshot_path ? <ItemImage path={item.screenshot_path} alt="元のスクリーンショット" fit="contain" className="max-h-[70vh] w-full rounded-xl border" /> : null}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <StatusBadge status={item.status} />
                  {cats.map((c) => <CategoryChip key={c!.id} name={c!.name} color={c!.color} icon={c!.icon} small />)}
                </div>
                <h1 className="font-serif text-2xl font-semibold leading-snug">{item.name}</h1>
                {item.original_name && item.original_name !== item.name ? <p className="mt-1 text-[13px] text-muted-foreground">{item.original_name}</p> : null}
              </div>

              <Card className="bg-primary-soft/40">
                <CardContent className="flex items-end justify-between gap-3 p-5">
                  <div>
                    <p className="text-[12px] text-muted-foreground">{purchased ? "購入金額" : item.status === "cancelled" ? "（集計対象外）" : "予定金額"}</p>
                    <p className="text-3xl font-semibold tabular">{formatYen(item.status === "cancelled" ? plannedTotal(item) : effectiveTotal(item))}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground tabular">
                      {formatYen(purchased ? (item.actual_unit_price ?? item.planned_unit_price) : item.planned_unit_price)} × {item.quantity}点{item.shipping_fee ? ` ＋ 送料${formatYen(item.shipping_fee)}` : ""}
                    </p>
                  </div>
                  <QuickStatusButton item={item} className="h-11 px-5 text-[14px]" />
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">購入状況</span>
                <NativeSelect value={item.status} onChange={(e) => changeStatus(e.target.value as ItemStatus)} className="h-10 w-auto" aria-label="購入状況を変更">
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </NativeSelect>
              </div>

              {isSafeHttpUrl(item.url) ? (
                <Button asChild variant="accent" className="w-full md:w-auto">
                  <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> 商品ページを開く</a>
                </Button>
              ) : null}

              <Card>
                <CardContent className="p-5 pt-3">
                  <dl>
                    <Row label="予定単価">{formatYen(item.planned_unit_price)}</Row>
                    <Row label="実際の購入単価">{formatYen(item.actual_unit_price)}</Row>
                    <Row label="数量">{item.quantity}点</Row>
                    <Row label="送料">{formatYen(item.shipping_fee)}</Row>
                    <Row label="予定合計">{formatYen(plannedTotal(item))}</Row>
                    {purchased ? <Row label="実績合計">{formatYen(actualTotal(item))}</Row> : null}
                    <Row label="購入日">{formatDate(item.purchase_date)}</Row>
                    <Row label="購入先">{item.purchase_store}</Row>
                    <Row label="販売サイト">{item.store}</Row>
                    <Row label="メーカー">{item.brand}</Row>
                    <Row label="型番">{item.model_number}</Row>
                    <Row label="種類">{item.item_type}</Row>
                    <Row label="色">{item.color}</Row>
                    <Row label="サイズ">{item.size}</Row>
                    <Row label="登録日時">{formatDateTime(item.created_at)}</Row>
                  </dl>
                </CardContent>
              </Card>

              {item.description ? (
                <Card><CardHeader><CardTitle>商品説明</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{item.description}</CardContent></Card>
              ) : null}
              {item.notes ? (
                <Card><CardHeader><CardTitle>メモ</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{item.notes}</CardContent></Card>
              ) : null}
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>領収書・レシート</CardTitle></CardHeader>
            <CardContent>
              <ReceiptManager
                itemId={item.id}
                defaults={{ purchase_date: item.purchase_date, store: item.purchase_store ?? item.store, amount: purchased ? actualTotal(item) : null }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2"><History className="size-4 text-muted-foreground" /><CardTitle>購入履歴・価格変更の記録</CardTitle></CardHeader>
            <CardContent>
              {events.data?.length ? (
                <ol className="space-y-2.5 border-l pl-4">
                  {events.data.map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" />
                      <p>{eventText(e)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">記録はまだありません</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <PurchaseDialog item={item} open={purchaseStatus !== null} onOpenChange={(o) => !o && setPurchaseStatus(null)} initialStatus={purchaseStatus ?? "purchased"} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="この商品を削除しますか？"
        description={`「${item.name}」と、添付された画像・領収書がすべて削除されます。この操作は取り消せません。`}
        pending={del.isPending}
        onConfirm={() =>
          del.mutate(item, {
            onSuccess: () => {
              toast.success("削除しました");
              router.replace("/items");
            },
            onError: (e) => toast.error(`削除に失敗しました: ${errorMessage(e)}`),
          })
        }
      />
    </div>
  );
}
