import { prisma } from "@/lib/prisma";
import type { DailySearchSchedule } from "@/generated/prisma/client";
import { DEFAULT_USER_ID, isValidScheduleTime } from "@/lib/schedule/scheduleTime";

// DB(prisma)に依存しない定数・関数はscheduleTime.tsに分離してある
// （クライアントコンポーネントからはこちらではなくscheduleTime.tsを直接importすること。
// このファイルはprismaを直接importしており、クライアントバンドルに含めるとbuildが失敗する）。
export { DEFAULT_USER_ID, DEFAULT_SCHEDULE_TIME, DEFAULT_TIMEZONE, isValidScheduleTime, isScheduledTimeNow } from "@/lib/schedule/scheduleTime";

/**
 * 日次自動探索(STEP1: /api/cron/daily-search)の実行スケジュール設定を取得する。
 * まだ一度も保存されていないユーザーの場合、既定値（自動探索OFF・08:00・Asia/Tokyo）で
 * 新規作成してから返す。設定画面（/settings）から呼ぶ想定。
 * cron側の判定（runScheduledDailySearch.ts）では、ポーリングのたびに書き込みが
 * 発生しないよう、代わりに読み取り専用の getDailySearchSchedule() を使う。
 */
export async function getOrCreateDailySearchSchedule(
  userId: string = DEFAULT_USER_ID,
): Promise<DailySearchSchedule> {
  return prisma.dailySearchSchedule.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/**
 * 日次自動探索の実行スケジュール設定を読み取り専用で取得する。保存されていない場合はnull。
 * 外部スケジューラが毎分〜数分間隔で呼び出す想定の runScheduledDailySearch.ts から使う
 * （getOrCreateDailySearchSchedule()と異なり、ポーリングのたびにDBへ書き込みを発生させない）。
 */
export async function getDailySearchSchedule(
  userId: string = DEFAULT_USER_ID,
): Promise<DailySearchSchedule | null> {
  return prisma.dailySearchSchedule.findUnique({ where: { userId } });
}

export interface UpdateDailySearchScheduleInput {
  enabled: boolean;
  time: string; // "HH:mm"
}

/**
 * スケジュール設定を作成/更新する。timeの形式が不正な場合はエラーを投げる
 * （呼び出し元のServer Actionでcatchし、画面にエラーメッセージとして表示する想定）。
 */
export async function updateDailySearchSchedule(
  input: UpdateDailySearchScheduleInput,
  userId: string = DEFAULT_USER_ID,
): Promise<DailySearchSchedule> {
  if (!isValidScheduleTime(input.time)) {
    throw new Error("探索時刻はHH:mm形式（00:00〜23:59）で指定してください");
  }

  return prisma.dailySearchSchedule.upsert({
    where: { userId },
    update: { enabled: input.enabled, time: input.time },
    create: { userId, enabled: input.enabled, time: input.time },
  });
}
