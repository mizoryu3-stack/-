import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ヘッダーの未読通知バッジが常に最新の件数を反映するよう、レイアウト全体を動的レンダリングにする
// （静的プリレンダリングされると、お気に入りページで発生したのと同じ「値が古いまま」の問題が起きるため）。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "民泊物件サーチ",
  description: "民泊運営者向け・収益性で物件を探すプロトタイプアプリ",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // ヘッダーの未読通知バッジ用。失敗してもレイアウト自体は表示できるようにする。
  const unreadCount = await prisma.propertyMatch.count({ where: { readAt: null } }).catch(() => 0);

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
              🏠 民泊物件サーチ
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                物件検索
              </Link>
              <Link href="/favorites" className="hover:text-slate-900">
                お気に入り
              </Link>
              <Link href="/saved-searches" className="hover:text-slate-900">
                検索条件
              </Link>
              <Link href="/notifications" className="relative hover:text-slate-900">
                🔔 通知
                {unreadCount > 0 && (
                  <span className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/settings" className="hover:text-slate-900">
                ⚙️ 設定
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          プロトタイプ版 ・ 民泊適性スコアは仮ロジックによる暫定値です
        </footer>
      </body>
    </html>
  );
}
