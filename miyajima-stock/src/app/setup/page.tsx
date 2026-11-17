export const metadata = { title: "初期設定が必要です" };

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="font-serif text-2xl font-semibold">初期設定が必要です</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Supabase の接続情報が設定されていません。<code className="rounded bg-muted px-1">.env.local</code>（Vercel では環境変数）に
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> と
        <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> を設定してから再起動してください。
        詳しい手順は README.md をご覧ください。
      </p>
    </main>
  );
}
