"use client";

import { Download, Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/query-state";
import { ReceiptManager } from "@/components/receipts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeExpenses } from "@/lib/calc";
import { exportExpensesCsv } from "@/lib/export";
import { formatDate, formatYen, parseYen, todayJST } from "@/lib/format";
import { useDeleteExpense, useExpenses, useSaveExpense, type ExpenseInput } from "@/lib/queries";
import { EXPENSE_TYPES, type OtherExpense } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";

function ExpenseEditor({ expense, open, onOpenChange }: { expense: OtherExpense | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveExpense();
  const [v, setV] = useState({
    name: expense?.name ?? "",
    expense_type: expense?.expense_type ?? "内装工事費",
    estimated_amount: expense?.estimated_amount?.toString() ?? "",
    actual_amount: expense?.actual_amount?.toString() ?? "",
    is_confirmed: expense?.is_confirmed ?? false,
    expense_date: expense?.expense_date ?? "",
    vendor: expense?.vendor ?? "",
    notes: expense?.notes ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return toast.error("費用名を入力してください");
    const est = parseYen(v.estimated_amount);
    const act = parseYen(v.actual_amount);
    if ((v.estimated_amount.trim() && est === null) || (v.actual_amount.trim() && act === null)) return toast.error("金額は数字で入力してください");
    if (v.is_confirmed && act === null && est === null) return toast.error("確定にする場合は実績金額を入力してください");
    const input: ExpenseInput = {
      name: v.name.trim(), expense_type: v.expense_type, estimated_amount: est, actual_amount: act, is_confirmed: v.is_confirmed,
      expense_date: v.expense_date || null, vendor: v.vendor.trim() || null, notes: v.notes.trim() || null,
    };
    const run = () =>
      save.mutate({ id: expense?.id, input }, {
        onSuccess: () => { toast.success("保存しました"); onOpenChange(false); },
        onError: (err) => toast.error(`保存に失敗しました: ${errorMessage(err)}`, { action: { label: "再試行", onClick: run } }),
      });
    run();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={expense ? "その他費用を編集" : "その他費用を追加"} description="内装工事費・電気工事費・消防設備費・契約費など、商品以外の費用を管理します。" className="md:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <Field label="費用名 *" htmlFor="ex-name"><Input id="ex-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="例: 和室の畳張替え" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="種別" htmlFor="ex-type">
              <NativeSelect id="ex-type" value={v.expense_type} onChange={(e) => set("expense_type", e.target.value)}>
                {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </Field>
            <Field label="日付" htmlFor="ex-date"><Input id="ex-date" type="date" value={v.expense_date} onChange={(e) => set("expense_date", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 rounded-full bg-muted p-1 text-sm">
            {[false, true].map((c) => (
              <button key={String(c)} type="button" onClick={() => setV((p) => ({ ...p, is_confirmed: c, expense_date: c && !p.expense_date ? todayJST() : p.expense_date, actual_amount: c && !p.actual_amount ? p.estimated_amount : p.actual_amount }))} className={cn("rounded-full py-2 font-medium", v.is_confirmed === c ? "bg-card shadow-sm" : "text-muted-foreground")}>
                {c ? "確定（実績）" : "見積（未確定）"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="見積金額（円）" htmlFor="ex-est"><Input id="ex-est" inputMode="numeric" value={v.estimated_amount} onChange={(e) => set("estimated_amount", e.target.value)} /></Field>
            <Field label="実績金額（円）" htmlFor="ex-act"><Input id="ex-act" inputMode="numeric" value={v.actual_amount} onChange={(e) => set("actual_amount", e.target.value)} disabled={!v.is_confirmed} placeholder={v.is_confirmed ? "" : "確定後に入力"} /></Field>
          </div>
          <Field label="依頼先・支払先" htmlFor="ex-vendor"><Input id="ex-vendor" value={v.vendor} onChange={(e) => set("vendor", e.target.value)} /></Field>
          <Field label="メモ" htmlFor="ex-notes"><Textarea id="ex-notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : null}保存する</Button>
        </form>
        {expense ? (
          <div className="mt-6 border-t pt-4">
            <p className="mb-3 text-sm font-semibold">領収書・請求書</p>
            <ReceiptManager expenseId={expense.id} defaults={{ purchase_date: expense.expense_date, store: expense.vendor, amount: expense.actual_amount ?? expense.estimated_amount }} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const expenses = useExpenses();
  const del = useDeleteExpense();
  const [editor, setEditor] = useState<{ key: number; expense: OtherExpense | null } | null>(null);
  const [deleting, setDeleting] = useState<OtherExpense | null>(null);
  const sum = useMemo(() => summarizeExpenses(expenses.data ?? []), [expenses.data]);

  if (expenses.error) return <ErrorState error={expenses.error} onRetry={() => expenses.refetch()} />;

  return (
    <div>
      <PageHeader
        title="その他費用"
        description="商品購入費とは別に、工事費や契約費などを管理します"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportExpensesCsv(expenses.data ?? [])} disabled={!expenses.data?.length}><Download /> CSV</Button>
            <Button size="sm" onClick={() => setEditor({ key: Date.now(), expense: null })}><Plus /> 追加</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
        <Card><CardContent className="p-4"><p className="text-[12px] text-muted-foreground">実績（確定）</p><p className="mt-1 text-lg font-semibold tabular md:text-2xl">{formatYen(sum.confirmed)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[12px] text-muted-foreground">見積（未確定）</p><p className="mt-1 text-lg font-semibold tabular md:text-2xl">{formatYen(sum.estimated)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-[12px] text-muted-foreground">合計</p><p className="mt-1 text-lg font-semibold tabular md:text-2xl">{formatYen(sum.total)}</p></CardContent></Card>
      </div>
      {expenses.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !expenses.data?.length ? (
        <EmptyState icon={<Receipt className="size-8" />} title="その他費用はまだありません" description="内装工事費・電気工事費・消防設備費・契約費などを見積金額で登録し、確定後に実績金額へ変更できます。" action={<Button onClick={() => setEditor({ key: Date.now(), expense: null })}><Plus /> 費用を追加</Button>} />
      ) : (
        <ul className="space-y-2">
          {expenses.data.map((x) => (
            <li key={x.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditor({ key: Date.now(), expense: x })}>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", x.is_confirmed ? "bg-primary text-primary-foreground" : "bg-accent-soft text-accent")}>{x.is_confirmed ? "確定" : "見積"}</span>
                  <span className="text-[12px] text-muted-foreground">{x.expense_type}</span>
                </div>
                <p className="mt-1 truncate font-medium">{x.name}</p>
                <p className="text-[12px] text-muted-foreground">{formatDate(x.expense_date)}{x.vendor ? ` ・ ${x.vendor}` : ""}</p>
              </button>
              <div className="text-right">
                <p className="font-semibold tabular">{formatYen(x.is_confirmed ? (x.actual_amount ?? x.estimated_amount) : x.estimated_amount)}</p>
                {x.is_confirmed && x.estimated_amount !== null && x.actual_amount !== null && x.actual_amount !== x.estimated_amount ? (
                  <p className="text-[11px] text-muted-foreground tabular">見積 {formatYen(x.estimated_amount)}</p>
                ) : null}
              </div>
              <div className="flex flex-col">
                <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-muted" onClick={() => setEditor({ key: Date.now(), expense: x })} aria-label="編集"><Pencil className="size-4" /></button>
                <button type="button" className="rounded p-1.5 text-destructive hover:bg-muted" onClick={() => setDeleting(x)} aria-label="削除"><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editor ? <ExpenseEditor key={editor.key} expense={editor.expense} open onOpenChange={(o) => !o && setEditor(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="この費用を削除しますか？"
        description={`「${deleting?.name ?? ""}」と添付された領収書が削除されます。`}
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => { toast.success("削除しました"); setDeleting(null); }, onError: (e) => toast.error(errorMessage(e)) })}
      />
    </div>
  );
}
