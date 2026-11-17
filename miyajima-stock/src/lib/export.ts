"use client";

import { actualTotal, effectiveTotal, plannedTotal } from "./calc";
import { todayJST } from "./format";
import { GROUP_LABEL, STATUS_GROUP, STATUS_LABEL } from "./status";
import type { Category, ItemWithCategories, OtherExpense } from "./types";

const ITEM_HEADERS = [
  "商品名",
  "元の商品名",
  "種類",
  "カテゴリー",
  "購入状況",
  "集計区分",
  "予定単価",
  "実際の購入単価",
  "数量",
  "送料",
  "予定合計",
  "実績合計",
  "集計金額",
  "購入日",
  "購入先",
  "販売サイト",
  "メーカー",
  "型番",
  "色",
  "サイズ",
  "商品URL",
  "メモ",
  "登録日",
] as const;

type Cell = string | number | null;

export function itemRows(items: ItemWithCategories[], categories: Category[]): Cell[][] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return items.map((it) => {
    const purchased = STATUS_GROUP[it.status] === "purchased";
    return [
      it.name,
      it.original_name,
      it.item_type,
      it.category_ids.map((id) => catName.get(id)).filter(Boolean).join("、"),
      STATUS_LABEL[it.status],
      GROUP_LABEL[STATUS_GROUP[it.status]],
      it.planned_unit_price,
      it.actual_unit_price,
      it.quantity,
      it.shipping_fee,
      plannedTotal(it),
      purchased ? actualTotal(it) : null,
      effectiveTotal(it),
      it.purchase_date,
      it.purchase_store,
      it.store,
      it.brand,
      it.model_number,
      it.color,
      it.size,
      it.url,
      it.notes,
      it.created_at.slice(0, 10),
    ];
  });
}

const EXPENSE_HEADERS = ["費用名", "種別", "状態", "見積金額", "実績金額", "集計金額", "日付", "依頼先", "メモ"] as const;

export function expenseRows(expenses: OtherExpense[]): Cell[][] {
  return expenses.map((e) => [
    e.name,
    e.expense_type,
    e.is_confirmed ? "確定" : "見積",
    e.estimated_amount,
    e.actual_amount,
    e.is_confirmed ? (e.actual_amount ?? e.estimated_amount ?? 0) : (e.estimated_amount ?? 0),
    e.expense_date,
    e.vendor,
    e.notes,
  ]);
}

function csvEscape(v: Cell): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // CSV インジェクション対策（Excel で数式として解釈されないように）
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** UTF-8 BOM 付き CSV（Excel で開いても文字化けしません） */
export function exportItemsCsv(items: ItemWithCategories[], categories: Category[]) {
  const lines = [ITEM_HEADERS as readonly Cell[], ...itemRows(items, categories)].map((r) => r.map(csvEscape).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  download(blob, `miyajima-stock_商品_${todayJST()}.csv`);
}

export function exportExpensesCsv(expenses: OtherExpense[]) {
  const lines = [EXPENSE_HEADERS as readonly Cell[], ...expenseRows(expenses)].map((r) => r.map(csvEscape).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  download(blob, `miyajima-stock_その他費用_${todayJST()}.csv`);
}

export async function exportXlsx(items: ItemWithCategories[], categories: Category[], expenses: OtherExpense[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MIYAJIMA STOCK";
  wb.created = new Date();

  const yenFmt = '#,##0"円"';
  const addSheet = (name: string, headers: readonly string[], rows: Cell[][], moneyCols: number[], widths: number[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow([...headers]);
    for (const r of rows) ws.addRow(r.map((v) => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v)));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4D3A" } };
    header.alignment = { vertical: "middle" };
    for (const c of moneyCols) ws.getColumn(c).numFmt = yenFmt;
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    return ws;
  };

  addSheet("商品", ITEM_HEADERS, itemRows(items, categories), [7, 8, 10, 11, 12, 13], [24, 30, 12, 18, 12, 12, 12, 14, 8, 10, 12, 12, 12, 12, 14, 14, 14, 14, 10, 18, 40, 30, 12]);
  addSheet("その他費用", EXPENSE_HEADERS, expenseRows(expenses), [4, 5, 6], [24, 14, 8, 14, 14, 14, 12, 18, 30]);

  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `miyajima-stock_${todayJST()}.xlsx`,
  );
}

/** 全データの JSON バックアップ */
export function exportJsonBackup(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  download(blob, `miyajima-stock_backup_${todayJST()}.json`);
}
