import { Prisma } from "@/generated/prisma/client";
import { runDailySearch, type DailySearchSummary } from "@/lib/ingestion/runDailySearch";
import { getDailySearchSchedule } from "@/lib/schedule/dailySearchSchedule";
import { isScheduledTimeNow, getScheduledDateKey } from "@/lib/schedule/scheduleTime";

export type ScheduledRunSkipReason =
  | "NO_SCHEDULE" // DailySearchScheduleがまだ一度も保存されていない
  | "DISABLED" // 自動探索がOFF
  | "NOT_SCHEDULED_TIME" // 現在時刻が設定時刻と一致しない
  | "ALREADY_RAN_TODAY"; // 同じ日（スケジュールのタイムゾーン基準）の実行が既に存在する

export type ScheduledRunOutcome =
  | { ran: true; summary: DailySearchSummary }
  | { ran: false; reason: ScheduledRunSkipReason };

/**
 * STEP3: 外部スケジューラ（毎分〜数分間隔で /api/cron/daily-search を呼ぶ想定）から
 * 呼ばれる、日次自動探索の実行可否判定＋実行の本体。
 *
 * 判定の流れ:
 *   DailySearchSchedule取得（読み取り専用。ポーリングのたびに書き込みは発生させない）
 *     → 未保存なら NO_SCHEDULE でスキップ
 *     → enabled:false なら DISABLED でスキップ
 *     → isScheduledTimeNow() が false（現在時刻が設定時刻と不一致）なら NOT_SCHEDULED_TIME でスキップ
 *     → ここまで通れば runDailySearch() を scheduledFor（今日の日付キー）付きで呼ぶ
 *
 * 二重実行防止（DBレベル）:
 *   runDailySearch() 内の SearchRun.create() に scheduledFor を渡しており、
 *   SearchRun.scheduledFor は @unique 制約が付いている。同じ日に2件目の
 *   スケジュール実行を作ろうとすると、この create() 自体がPrisma P2002
 *   （UNIQUE制約違反）で失敗する。これをここで捕捉し ALREADY_RAN_TODAY として扱う。
 *   「先にSELECTで確認してからCREATEする」方式ではなく、CREATE自体を判定に使うため、
 *   ほぼ同時に複数リクエストが来た場合でも競合状態(race condition)なく二重実行を防げる。
 *
 * スキップ・実行いずれの場合も、理由がわかるようconsole.infoにログを出す。
 * NO_SCHEDULE/DISABLED/NOT_SCHEDULED_TIMEのいずれもSearchRunを作成しない
 * （「探索を試みたが失敗した」わけではなく、「そもそも実行対象ではなかった」ため、
 * SearchRunの実行記録としては残さない設計にしている）。
 */
export async function runScheduledDailySearch(now: Date = new Date()): Promise<ScheduledRunOutcome> {
  const schedule = await getDailySearchSchedule();

  if (!schedule) {
    console.info("[daily-search] スケジュール未設定のためスキップしました");
    return { ran: false, reason: "NO_SCHEDULE" };
  }

  if (!schedule.enabled) {
    console.info("[daily-search] 自動探索がOFFのためスキップしました");
    return { ran: false, reason: "DISABLED" };
  }

  if (!isScheduledTimeNow(schedule, now)) {
    console.info(
      `[daily-search] 現在時刻が設定時刻(${schedule.time} ${schedule.timezone})と一致しないためスキップしました`,
    );
    return { ran: false, reason: "NOT_SCHEDULED_TIME" };
  }

  const scheduledFor = getScheduledDateKey(schedule.timezone, now);

  try {
    const summary = await runDailySearch(undefined, { scheduledFor });
    console.info(
      `[daily-search] スケジュール実行が完了しました（scheduledFor=${scheduledFor}, searchRunId=${summary.searchRunId}, status=${summary.status}）`,
    );
    return { ran: true, summary };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      console.info(`[daily-search] 本日分(${scheduledFor})は既に実行済みのためスキップしました`);
      return { ran: false, reason: "ALREADY_RAN_TODAY" };
    }
    throw error; // 想定外のエラーは呼び出し元(APIルート)に伝播させる
  }
}
