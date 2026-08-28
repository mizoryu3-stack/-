import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ この管理画面は開発用のプロトタイプです。認証は未実装のため、本番運用前に必ずアクセス制御を追加してください。トップページのナビゲーションには表示していません。
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <AdminNavLink href="/admin">ダッシュボード</AdminNavLink>
        <AdminNavLink href="/admin/properties/new">物件を登録</AdminNavLink>
        <AdminNavLink href="/admin/import">CSVインポート</AdminNavLink>
        <AdminNavLink href="/admin/duplicates">重複候補</AdminNavLink>
      </nav>

      {children}
    </div>
  );
}

function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
