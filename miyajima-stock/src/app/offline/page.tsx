import { WifiOff } from "lucide-react";

export const metadata = { title: "オフライン" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-lg font-semibold">オフラインです</h1>
      <p className="max-w-sm text-sm text-muted-foreground">インターネットに接続されていません。電波の良い場所で再度お試しください。データはクラウドに保存されているため失われません。</p>
      {/* オフライン時は完全な再読み込みが必要なため <a> を使用 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">再読み込み</a>
    </main>
  );
}
