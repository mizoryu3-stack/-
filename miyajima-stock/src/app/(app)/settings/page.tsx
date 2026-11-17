"use client";

import { Database, Download, FileSpreadsheet, LogOut, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { BudgetEditor } from "@/components/budget-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportExpensesCsv, exportItemsCsv, exportJsonBackup, exportXlsx } from "@/lib/export";
import { useCategories, useExpenses, useItems, useSettings } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/client";
import { cn, errorMessage } from "@/lib/utils";

const noopSubscribe = () => () => {};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const user = useQuery({ queryKey: ["auth-user"], queryFn: async () => (await getSupabase().auth.getUser()).data.user });
  const email = user.data?.email ?? null;
  const [busy, setBusy] = useState(false);
  const items = useItems();
  const categories = useCategories();
  const expenses = useExpenses();
  const settings = useSettings();

  const ready = Boolean(items.data && categories.data && expenses.data);

  const backup = async () => {
    setBusy(true);
    try {
      const supabase = getSupabase();
      const [events, receipts] = await Promise.all([
        supabase.from("item_events").select("*"),
        supabase.from("receipts").select("*"),
      ]);
      exportJsonBackup({
        exported_at: new Date().toISOString(),
        app: "MIYAJIMA STOCK",
        settings: settings.data,
        categories: categories.data,
        items: items.data,
        other_expenses: expenses.data,
        receipts: receipts.data,
        item_events: events.data,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="設定" />

      <Card>
        <CardHeader><CardTitle>予算</CardTitle><CardDescription>民泊開業の総予算（初期値 380万円）</CardDescription></CardHeader>
        <CardContent>{settings.data ? <BudgetEditor budget={settings.data.total_budget} /> : <p className="text-sm text-muted-foreground">読み込み中…</p>}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>データ出力・バックアップ</CardTitle><CardDescription>Excel で開いても文字化けしない形式で出力します</CardDescription></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" disabled={!ready} onClick={() => exportItemsCsv(items.data!, categories.data!)}><Download /> 商品データ（CSV）</Button>
          <Button variant="outline" disabled={!ready} onClick={() => exportExpensesCsv(expenses.data!)}><Download /> その他費用（CSV）</Button>
          <Button variant="outline" disabled={!ready || busy} onClick={async () => { setBusy(true); try { await exportXlsx(items.data!, categories.data!, expenses.data!); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }}><FileSpreadsheet /> すべて（Excel .xlsx）</Button>
          <Button variant="outline" disabled={!ready || busy} onClick={backup}><Database /> 全データのバックアップ（JSON）</Button>
          <p className="text-[12px] text-muted-foreground sm:col-span-2">データは Supabase のクラウドに保存されています。定期的なバックアップの出力をおすすめします。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>表示</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 rounded-full bg-muted p-1 text-sm">
            {[
              { v: "light", l: "ライト", i: Sun },
              { v: "dark", l: "ダーク", i: Moon },
              { v: "system", l: "自動", i: Monitor },
            ].map((o) => (
              <button key={o.v} type="button" onClick={() => setTheme(o.v)} className={cn("flex items-center justify-center gap-1.5 rounded-full py-2 font-medium", mounted && theme === o.v ? "bg-card shadow-sm" : "text-muted-foreground")}>
                <o.i className="size-4" /> {o.l}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2"><Smartphone className="size-4 text-muted-foreground" /><CardTitle>iPhone のホーム画面に追加</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-[13px] text-muted-foreground">
          <p>1. Safari でこのアプリを開く</p>
          <p>2. 画面下の「共有」ボタン（□に↑）をタップ</p>
          <p>3. 「ホーム画面に追加」→「追加」をタップ</p>
          <p>ホーム画面のアイコンから、アプリのように全画面で利用できます。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>アカウント</CardTitle><CardDescription>{email ?? "—"}</CardDescription></CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await getSupabase().auth.signOut();
              router.replace("/login");
              router.refresh();
            }}
          >
            <LogOut /> ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
