"use client";

import { Camera, ChevronDown, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatYen, parseYen, todayJST } from "@/lib/format";
import { STATUS_GROUP, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import type { Category, Item, ItemInput, ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryPicker } from "./category-picker";
import { ItemImage } from "./item-image";
import { Button } from "./ui/button";
import { Field, Input, NativeSelect, Textarea } from "./ui/input";

export const STORE_OPTIONS = ["Amazon", "楽天市場", "ニトリ", "Yahoo!ショッピング", "IKEA", "無印良品", "LOWYA", "ホームセンター", "家電量販店", "その他"];

export interface ItemFormValues {
  name: string;
  original_name: string;
  item_type: string;
  brand: string;
  model_number: string;
  color: string;
  size: string;
  description: string;
  store: string;
  url: string;
  planned_unit_price: string;
  actual_unit_price: string;
  quantity: string;
  shipping_fee: string;
  status: ItemStatus;
  purchase_date: string;
  purchase_store: string;
  notes: string;
  categoryIds: string[];
}

export function emptyValues(): ItemFormValues {
  return {
    name: "", original_name: "", item_type: "", brand: "", model_number: "", color: "", size: "", description: "",
    store: "", url: "", planned_unit_price: "", actual_unit_price: "", quantity: "1", shipping_fee: "", status: "planned",
    purchase_date: "", purchase_store: "", notes: "", categoryIds: [],
  };
}

export function valuesFromItem(item: Item & { category_ids?: string[] }): ItemFormValues {
  const s = (v: string | null) => v ?? "";
  const n = (v: number | null) => (v === null || v === undefined ? "" : String(v));
  return {
    name: item.name, original_name: s(item.original_name), item_type: s(item.item_type), brand: s(item.brand),
    model_number: s(item.model_number), color: s(item.color), size: s(item.size), description: s(item.description),
    store: s(item.store), url: s(item.url), planned_unit_price: n(item.planned_unit_price), actual_unit_price: n(item.actual_unit_price),
    quantity: String(item.quantity), shipping_fee: item.shipping_fee ? String(item.shipping_fee) : "", status: item.status,
    purchase_date: s(item.purchase_date), purchase_store: s(item.purchase_store), notes: s(item.notes), categoryIds: item.category_ids ?? [],
  };
}

/** フォーム値 → DB 入力値。エラーがあれば文字列で返す */
export function valuesToInput(v: ItemFormValues): { input: Partial<ItemInput> & { name: string }; error?: string } {
  const t = (s: string) => (s.trim() ? s.trim() : null);
  const name = v.name.trim();
  const qty = Number.parseInt(v.quantity, 10);
  const input = {
    name,
    original_name: t(v.original_name),
    item_type: t(v.item_type),
    brand: t(v.brand),
    model_number: t(v.model_number),
    color: t(v.color),
    size: t(v.size),
    description: t(v.description),
    store: t(v.store),
    url: t(v.url),
    planned_unit_price: parseYen(v.planned_unit_price),
    actual_unit_price: parseYen(v.actual_unit_price),
    quantity: Number.isFinite(qty) && qty >= 1 ? qty : 1,
    shipping_fee: parseYen(v.shipping_fee) ?? 0,
    status: v.status,
    purchase_date: t(v.purchase_date),
    purchase_store: t(v.purchase_store),
    notes: t(v.notes),
  };
  if (!name) return { input, error: "商品名を入力してください" };
  if (name.length > 200) return { input, error: "商品名は200文字以内にしてください" };
  if (v.planned_unit_price.trim() && input.planned_unit_price === null) return { input, error: "予定単価は数字で入力してください" };
  if (v.actual_unit_price.trim() && input.actual_unit_price === null) return { input, error: "実際の購入単価は数字で入力してください" };
  if (input.url && !/^https?:\/\//i.test(input.url)) return { input, error: "URLは http:// または https:// から始めてください" };
  return { input };
}

interface ImageSlot {
  /** 保存済みの画像パス */
  path?: string | null;
  /** 新しく選択した画像 */
  blob?: Blob | null;
}

export function ItemForm({
  values, onChange, categories, image, onImageChange, compact = false, idPrefix = "f",
}: {
  values: ItemFormValues;
  onChange: (v: ItemFormValues) => void;
  categories: Category[];
  image?: ImageSlot;
  onImageChange?: (blob: Blob | null) => void;
  compact?: boolean;
  idPrefix?: string;
}) {
  const set = <K extends keyof ItemFormValues>(k: K, val: ItemFormValues[K]) => onChange({ ...values, [k]: val });
  const purchased = STATUS_GROUP[values.status] === "purchased";
  const [showDetails, setShowDetails] = useState(!compact);
  const fileRef = useRef<HTMLInputElement>(null);
  const blob = image?.blob ?? null;
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const totals = useMemo(() => {
    const { input } = valuesToInput(values);
    const unit = purchased ? (input.actual_unit_price ?? input.planned_unit_price) : input.planned_unit_price;
    if (unit === null || unit === undefined) return null;
    return unit * (input.quantity ?? 1) + (input.shipping_fee ?? 0);
  }, [values, purchased]);

  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="space-y-5">
      {onImageChange ? (
        <div className="flex items-center gap-4">
          <div className="size-24 shrink-0 overflow-hidden rounded-xl border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="商品画像" className="size-full object-cover" />
            ) : image?.path ? (
              <ItemImage path={image.path} alt="商品画像" className="size-full" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/60">
                <Camera className="size-7" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus /> {preview || image?.path ? "画像を変更" : "画像を追加"}
            </Button>
            {preview ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onImageChange(null)}>
                <Trash2 /> 選択を取り消す
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImageChange(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      <Field label="商品名 *" htmlFor={id("name")}>
        <Input id={id("name")} value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="例: 木製ローテーブル" required maxLength={200} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={purchased ? "予定単価（円）" : "単価（円）"} htmlFor={id("price")}>
          <Input id={id("price")} inputMode="numeric" value={values.planned_unit_price} onChange={(e) => set("planned_unit_price", e.target.value)} placeholder="未入力可" />
        </Field>
        <Field label="数量" htmlFor={id("qty")}>
          <div className="flex h-11 items-center rounded-lg border border-input bg-card">
            <button type="button" className="h-full w-11 text-lg text-muted-foreground" aria-label="数量を減らす" onClick={() => set("quantity", String(Math.max(1, (Number.parseInt(values.quantity, 10) || 1) - 1)))}>−</button>
            <input id={id("qty")} inputMode="numeric" className="h-full w-full min-w-0 bg-transparent text-center tabular focus:outline-none" value={values.quantity} onChange={(e) => set("quantity", e.target.value.replace(/[^0-9]/g, ""))} />
            <button type="button" className="h-full w-11 text-lg text-muted-foreground" aria-label="数量を増やす" onClick={() => set("quantity", String((Number.parseInt(values.quantity, 10) || 0) + 1))}>＋</button>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="販売サイト" htmlFor={id("store")}>
          <Input id={id("store")} list={id("stores")} value={values.store} onChange={(e) => set("store", e.target.value)} placeholder="Amazon など" />
          <datalist id={id("stores")}>{STORE_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="購入状況" htmlFor={id("status")}>
          <NativeSelect
            id={id("status")}
            value={values.status}
            onChange={(e) => {
              const status = e.target.value as ItemStatus;
              const next = { ...values, status };
              if (STATUS_GROUP[status] === "purchased" && !values.purchase_date) next.purchase_date = todayJST();
              onChange(next);
            }}
          >
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </NativeSelect>
        </Field>
      </div>

      {purchased ? (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-primary-soft/60 p-3">
          <Field label="実際の購入単価（円）" htmlFor={id("actual")}>
            <Input id={id("actual")} inputMode="numeric" value={values.actual_unit_price} onChange={(e) => set("actual_unit_price", e.target.value)} placeholder={values.planned_unit_price || "未入力なら予定単価"} />
          </Field>
          <Field label="購入日" htmlFor={id("pdate")}>
            <Input id={id("pdate")} type="date" value={values.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
          </Field>
          <Field label="購入先" htmlFor={id("pstore")} className="col-span-2">
            <Input id={id("pstore")} list={id("stores")} value={values.purchase_store} onChange={(e) => set("purchase_store", e.target.value)} placeholder={values.store || "Amazon など"} />
          </Field>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
        <span className="text-muted-foreground">{purchased ? "購入金額（単価×数量＋送料）" : "予定金額（単価×数量＋送料）"}</span>
        <span className="text-base font-semibold tabular">{totals === null ? "—" : formatYen(totals)}</span>
      </div>

      <Field label="カテゴリー（複数選択可）">
        <CategoryPicker categories={categories} value={values.categoryIds} onChange={(ids) => set("categoryIds", ids)} />
      </Field>

      <Field label="商品URL" htmlFor={id("url")}>
        <Input id={id("url")} type="url" inputMode="url" value={values.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
      </Field>

      <Field label="メモ" htmlFor={id("notes")}>
        <Textarea id={id("notes")} value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder="設置場所、色違い候補など" />
      </Field>

      <button type="button" onClick={() => setShowDetails((s) => !s)} className="flex w-full items-center justify-between rounded-lg py-1 text-sm font-medium text-primary">
        詳細情報（メーカー・型番・サイズなど）
        <ChevronDown className={cn("size-4 transition-transform", showDetails && "rotate-180")} />
      </button>

      {showDetails ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="元の商品名" htmlFor={id("orig")} className="sm:col-span-2">
            <Textarea id={id("orig")} className="min-h-16" value={values.original_name} onChange={(e) => set("original_name", e.target.value)} />
          </Field>
          <Field label="商品の種類" htmlFor={id("type")}>
            <Input id={id("type")} value={values.item_type} onChange={(e) => set("item_type", e.target.value)} placeholder="テーブル" />
          </Field>
          <Field label="メーカー・ブランド" htmlFor={id("brand")}>
            <Input id={id("brand")} value={values.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="型番" htmlFor={id("model")}>
            <Input id={id("model")} value={values.model_number} onChange={(e) => set("model_number", e.target.value)} />
          </Field>
          <Field label="色" htmlFor={id("color")}>
            <Input id={id("color")} value={values.color} onChange={(e) => set("color", e.target.value)} />
          </Field>
          <Field label="サイズ・寸法" htmlFor={id("size")}>
            <Input id={id("size")} value={values.size} onChange={(e) => set("size", e.target.value)} />
          </Field>
          <Field label="送料（円）" htmlFor={id("ship")}>
            <Input id={id("ship")} inputMode="numeric" value={values.shipping_fee} onChange={(e) => set("shipping_fee", e.target.value)} placeholder="0" />
          </Field>
          {!purchased ? (
            <Field label="購入日" htmlFor={id("pdate2")}>
              <Input id={id("pdate2")} type="date" value={values.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            </Field>
          ) : null}
          <Field label="商品説明" htmlFor={id("desc")} className="sm:col-span-2">
            <Textarea id={id("desc")} value={values.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
