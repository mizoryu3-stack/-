"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getSupabase } from "@/lib/supabase/client";
import { cn, errorMessage } from "@/lib/utils";

type Mode = "login" | "signup" | "reset";

function translate(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "メールアドレスまたはパスワードが正しくありません";
  if (/Email not confirmed/i.test(msg)) return "メールアドレスの確認が完了していません。受信したメールのリンクを開いてください";
  if (/User already registered/i.test(msg)) return "このメールアドレスはすでに登録されています";
  if (/Password should be at least/i.test(msg)) return "パスワードは8文字以上にしてください";
  if (/Signups not allowed/i.test(msg)) return "新規登録は現在受け付けていません";
  if (/rate limit/i.test(msg)) return "短時間に操作が集中しました。しばらく待ってから再度お試しください";
  return msg;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "リンクの有効期限が切れているか、無効です。もう一度お試しください。" : null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = getSupabase();
    const redirect = `${window.location.origin}/auth/callback`;
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const next = params.get("next");
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
        router.refresh();
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) throw new Error("パスワードは8文字以上にしてください");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }
        setInfo("確認メールを送信しました。メール内のリンクを開くと登録が完了します。");
        setMode("login");
      }
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${redirect}?type=recovery` });
        if (error) throw error;
        setInfo("パスワード再設定用のメールを送信しました。");
      }
    } catch (err) {
      setError(translate(errorMessage(err)));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_60%)] p-5">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="scale-125" />
          <p className="mt-2 text-[13px] text-muted-foreground">宮島民泊 購入品・購入予定品管理</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {mode !== "reset" ? (
            <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1 text-sm">
              {(["login", "signup"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError(null); }} className={cn("rounded-full py-2 font-medium transition-colors", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  {m === "login" ? "ログイン" : "新規登録"}
                </button>
              ))}
            </div>
          ) : (
            <h1 className="mb-4 font-semibold">パスワードの再設定</h1>
          )}
          <form onSubmit={submit} className="space-y-4">
            <Field label="メールアドレス" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {mode !== "reset" ? (
              <Field label="パスワード" htmlFor="password" hint={mode === "signup" ? "8文字以上" : undefined}>
                <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            ) : null}
            {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
            {info ? <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary" role="status">{info}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "login" ? "ログイン" : mode === "signup" ? "登録する" : "再設定メールを送る"}
            </Button>
          </form>
          <div className="mt-4 text-center text-[13px]">
            {mode === "reset" ? (
              <button type="button" className="text-primary" onClick={() => setMode("login")}>ログインに戻る</button>
            ) : (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode("reset")}>パスワードを忘れた場合</button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
