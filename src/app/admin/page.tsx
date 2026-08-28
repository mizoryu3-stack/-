import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { findProviderInfo } from "@/lib/ingestion/providers/registry";
import { formatRelativeTime, listingStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminDashboardPage() {
  const sevenDaysAgo = daysAgo(7);

  const [
    total,
    statusGroups,
    sourceGroups,
    pendingDuplicates,
    recentBatches,
    oldestChecked,
    newPropertiesLast7Days,
    savedSearchTotal,
    savedSearchEnabled,
    matchTotal,
    unreadNotifications,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.groupBy({ by: ["listingStatus"], _count: { _all: true } }),
    prisma.property.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.duplicateCandidate.count({ where: { status: "PENDING" } }),
    prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.property.findFirst({
      where: { listingStatus: "ACTIVE" },
      orderBy: { lastCheckedAt: "asc" },
      select: { lastCheckedAt: true },
    }),
    prisma.property.count({ where: { firstSeenAt: { gte: sevenDaysAgo } } }),
    prisma.savedSearch.count(),
    prisma.savedSearch.count({ where: { enabled: true } }),
    prisma.propertyMatch.count(),
    prisma.propertyMatch.count({ where: { readAt: null } }),
  ]);

  const statusCounts: Record<string, number> = { ACTIVE: 0, ENDED: 0, UNKNOWN: 0 };
  for (const g of statusGroups) statusCounts[g.listingStatus] = g._count._all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">管理ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">登録物件・データ品質の状況を確認できます。</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="登録物件数" value={total} />
        <StatCard label="掲載中" value={statusCounts.ACTIVE} tone="emerald" />
        <StatCard label="掲載終了" value={statusCounts.ENDED} tone="slate" />
        <StatCard label="確認できません" value={statusCounts.UNKNOWN} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700">データ取得元別件数</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sourceGroups.map((g) => {
              const info = findProviderInfo(g.source);
              return (
                <li key={g.source} className="flex items-center justify-between">
                  <span className="text-slate-600">
                    {info?.name ?? g.source}
                    {info && !info.connected && (
                      <span className="ml-2 text-xs text-slate-400">(未接続)</span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-800">{g._count._all}件</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700">データ品質</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">
                <Link href="/admin/duplicates" className="hover:underline">
                  重複候補（未確認）
                </Link>
              </dt>
              <dd className="font-semibold text-slate-800">{pendingDuplicates}件</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">最も確認が古いACTIVE物件</dt>
              <dd className="font-semibold text-slate-800">
                {oldestChecked ? formatRelativeTime(oldestChecked.lastCheckedAt) : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">新着物件・通知</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <div>
            <dt className="text-slate-400">新規登録（7日以内）</dt>
            <dd className="font-semibold text-slate-800">{newPropertiesLast7Days}件</dd>
          </div>
          <div>
            <dt className="text-slate-400">
              <Link href="/saved-searches" className="hover:underline">
                保存検索条件
              </Link>
            </dt>
            <dd className="font-semibold text-slate-800">
              {savedSearchEnabled}/{savedSearchTotal}件 有効
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">累計マッチ数</dt>
            <dd className="font-semibold text-slate-800">{matchTotal}件</dd>
          </div>
          <div>
            <dt className="text-slate-400">
              <Link href="/notifications" className="hover:underline">
                未読通知
              </Link>
            </dt>
            <dd className="font-semibold text-slate-800">{unreadNotifications}件</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">直近のCSV取込</h2>
        {recentBatches.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">取込履歴はまだありません。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-4">日時</th>
                  <th className="py-1 pr-4">ファイル</th>
                  <th className="py-1 pr-4">件数</th>
                  <th className="py-1 pr-4">新規/更新</th>
                  <th className="py-1 pr-4">エラー</th>
                  <th className="py-1 pr-4">重複候補</th>
                </tr>
              </thead>
              <tbody>
                {recentBatches.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 text-slate-500">{formatRelativeTime(b.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <Link href={`/admin/import/${b.id}`} className="text-slate-700 hover:underline">
                        {b.fileName ?? `バッチ#${b.id}`}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{b.totalRows}行</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {b.createdCount}件 / {b.updatedCount}件
                    </td>
                    <td className={`py-2 pr-4 font-semibold ${b.errorCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                      {b.errorCount}件
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{b.duplicateCandidateCount}件</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">掲載状態ラベル: {Object.values(listingStatusLabel).join(" / ")}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClass = {
    slate: "text-slate-800",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value.toLocaleString("ja-JP")}</p>
    </div>
  );
}
