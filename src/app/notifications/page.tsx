import { prisma } from "@/lib/prisma";
import { formatRelativeTime, formatYen } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";
import { markAllNotificationsRead, markNotificationReadAndGo } from "@/app/notifications/actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const matches = await prisma.propertyMatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { property: true, savedSearch: true },
  });

  const unreadCount = matches.filter((m) => !m.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">通知</h1>
          <p className="mt-1 text-sm text-slate-500">
            保存した検索条件に一致する新着物件をお知らせします。
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              すべて既読にする
            </button>
          </form>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          通知はまだありません。
          <br />
          物件検索画面から気になる条件を保存すると、新着物件の通知がここに届きます。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((m) => (
            <form key={m.id} action={markNotificationReadAndGo.bind(null, m.id, m.propertyId)}>
              <button
                type="submit"
                className={`w-full rounded-xl border p-4 text-left shadow-sm transition hover:border-slate-400 ${
                  m.readAt ? "border-slate-200 bg-white" : "border-sky-300 bg-sky-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{m.readAt ? "" : "🔔 "}新着物件</span>
                  <span>・{formatRelativeTime(m.createdAt)}</span>
                  {!m.readAt && (
                    <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      未読
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  「{m.savedSearch.name}」の条件に一致する新着物件があります
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-900">{m.property.name}</span>
                  <span className="text-sm text-slate-500">{m.property.city}</span>
                  <span className="text-sm text-slate-500">{formatYen(m.property.rent)}</span>
                  <ScoreBadge score={m.property.minpakuScore} size="sm" />
                </div>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
