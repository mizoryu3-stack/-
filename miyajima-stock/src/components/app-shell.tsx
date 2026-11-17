"use client";

import { BarChart3, FolderTree, Home, List, Plus, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtimeSync } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/items", label: "商品一覧", icon: List },
  { href: "/add", label: "商品追加", icon: Plus, primary: true },
  { href: "/categories", label: "カテゴリー", icon: FolderTree },
  { href: "/settings", label: "設定", icon: Settings },
];

const SIDEBAR_EXTRA = [
  { href: "/analytics", label: "支出分析・予算", icon: BarChart3 },
  { href: "/expenses", label: "その他費用", icon: Receipt },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
          <path d="M5 9h22M8 9v17M24 9v17M4 13h24M10 13v-4M22 13v-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="font-serif text-[15px] font-semibold tracking-[0.18em]">MIYAJIMA</div>
        <div className="mt-0.5 text-[10px] font-medium tracking-[0.42em] text-accent">STOCK</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useRealtimeSync();

  return (
    <div className="min-h-dvh md:flex">
      {/* PC: サイドバー */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card/70 px-4 py-6 backdrop-blur md:flex">
        <Link href="/" className="px-2">
          <Logo />
        </Link>
        <Link
          href="/add"
          className="mt-8 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" /> 商品を追加
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {[...NAV.filter((n) => !n.primary), ...SIDEBAR_EXTRA].map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className="size-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-muted-foreground">宮島民泊 購入品・購入予定品管理</p>
      </aside>

      {/* スマホ: 上部ヘッダー */}
      <header className="pt-safe sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/"><Logo /></Link>
          <Link href="/analytics" className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted" aria-label="支出分析">
            <BarChart3 className="size-4" /> 分析
          </Link>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-10 md:pb-12 md:pt-8">
        <div className="mx-auto w-full max-w-6xl animate-fade-up">{children}</div>
      </main>

      {/* スマホ: 下部ナビゲーション */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden" aria-label="メインナビゲーション">
        <div className="grid h-16 grid-cols-5">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            if (n.primary) {
              return (
                <Link key={n.href} href={n.href} className="flex flex-col items-center justify-center" aria-label={n.label}>
                  <span className={cn("-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background", active && "bg-accent text-accent-foreground")}>
                    <Plus className="size-7" />
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{n.label}</span>
                </Link>
              );
            }
            return (
              <Link key={n.href} href={n.href} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <n.icon className={cn("size-[22px]", active && "stroke-[2.4]")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-wide md:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
