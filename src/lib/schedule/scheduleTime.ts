import type { DailySearchSchedule } from "@/generated/prisma/client";

/**
 * DailySearchSchedule関連の、DB(prisma)に依存しない純粋な定数・関数だけを集めたファイル。
 *
 * src/lib/schedule/dailySearchSchedule.ts（prismaを直接importする）から分離しているのは、
 * DailySearchScheduleForm.tsx（クライアントコンポーネント）がDEFAULT_TIMEZONE等の定数だけを
 * 使いたい場合に、better-sqlite3等のサーバー専用コードまでクライアントバンドルへ
 * 引き込んでしまう(next buildが失敗する)ことを避けるため。
 */

/**
 * 認証機能は未実装のため、SavedSearch等と同じ単一ユーザー前提の固定値を使う。
 * 将来ログイン機能を追加する際、実際のユーザーIDを渡すだけで移行できる
 * （DailySearchSchedule.userIdは@@uniqueのため、ユーザーごとに1件ずつ持てる構造になっている）。
 */
export const DEFAULT_USER_ID = "default-user";

export const DEFAULT_SCHEDULE_TIME = "08:00";
export const DEFAULT_TIMEZONE = "Asia/Tokyo";

const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm"（24時間表記・ゼロ埋め2桁、00:00〜23:59）形式かどうかを検証する */
export function isValidScheduleTime(value: string): boolean {
  return TIME_FORMAT.test(value);
}

/** 指定タイムゾーンでの現在時刻を"HH:mm"形式に整形する（分単位。秒は無視） */
function formatHHmmInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
  // 一部のICU実装ではhour12:falseの深夜0時が"24"になることがあるための防御的な正規化
  const hour = (hourRaw === "24" ? "00" : hourRaw).padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * 現在時刻(now)がスケジュールされた探索時刻と一致するか（分単位）を判定する純粋関数。
 *
 * STEP3で外部スケジューラを「毎分（または数分間隔）でdaily-searchを呼び出し、この関数が
 * trueを返した時だけ実際に探索を実行する」という運用を想定している。まだどこからも
 * 呼び出していない（実際の接続はSTEP3のスコープ）。
 *
 * enabled:falseの場合は常にfalseを返す。
 */
export function isScheduledTimeNow(
  schedule: Pick<DailySearchSchedule, "enabled" | "time" | "timezone">,
  now: Date = new Date(),
): boolean {
  if (!schedule.enabled) return false;
  return formatHHmmInTimezone(now, schedule.timezone) === schedule.time;
}
