import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { runScheduledDailySearch } from "@/lib/ingestion/runScheduledDailySearch";
import { updateDailySearchSchedule } from "@/lib/schedule/dailySearchSchedule";
import { resetDb } from "./setup/resetDb";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// 2026-01-15T23:00:00Z = 2026-01-16 08:00 JST（Asia/Tokyo, UTC+9）
const AT_0800_JST = new Date("2026-01-15T23:00:00Z");
// 同時刻の1分前・1時間前（JSTで07:59 / 07:00）
const AT_0759_JST = new Date("2026-01-15T22:59:00Z");
const AT_0700_JST = new Date("2026-01-15T22:00:00Z");
// 翌日08:00 JST
const NEXT_DAY_0800_JST = new Date("2026-01-16T23:00:00Z");

describe("runScheduledDailySearch", () => {
  it("要件1: enabled=trueかつ指定時刻ならrunDailySearch()が実行される", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const outcome = await runScheduledDailySearch(AT_0800_JST);

    expect(outcome.ran).toBe(true);
    if (outcome.ran) {
      expect(outcome.summary.status).toBe("COMPLETED");
    }
    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(1);
  });

  it("要件2: enabled=falseなら実行されない（SearchRunも作られない）", async () => {
    await updateDailySearchSchedule({ enabled: false, time: "08:00" });

    const outcome = await runScheduledDailySearch(AT_0800_JST);

    expect(outcome).toEqual({ ran: false, reason: "DISABLED" });
    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(0);
  });

  it("スケジュールが一度も保存されていない場合、NO_SCHEDULEとしてスキップされる", async () => {
    const outcome = await runScheduledDailySearch(AT_0800_JST);

    expect(outcome).toEqual({ ran: false, reason: "NO_SCHEDULE" });
    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(0);
  });

  it("要件3: 指定時刻以外は実行されない（SearchRunも作られない）", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const outcome = await runScheduledDailySearch(AT_0700_JST);

    expect(outcome).toEqual({ ran: false, reason: "NOT_SCHEDULED_TIME" });
    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(0);
  });

  it("要件4: Asia/Tokyoの時刻判定が正しい（サーバーのローカルタイムゾーンに依存しない）", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    // 08:00 JSTちょうどは実行される
    const matched = await runScheduledDailySearch(AT_0800_JST);
    expect(matched.ran).toBe(true);

    await resetDb();
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    // 07:59 JST（1分前）は実行されない
    const almostMatched = await runScheduledDailySearch(AT_0759_JST);
    expect(almostMatched).toEqual({ ran: false, reason: "NOT_SCHEDULED_TIME" });
  });

  it("要件5・要件10: 同じ時刻に複数回呼ばれても二重実行されず、SearchRun記録と整合する", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const first = await runScheduledDailySearch(AT_0800_JST);
    expect(first.ran).toBe(true);

    const second = await runScheduledDailySearch(AT_0800_JST);
    expect(second).toEqual({ ran: false, reason: "ALREADY_RAN_TODAY" });

    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(1); // 二重実行されず1件のまま
    expect(runs[0].scheduledFor).toBe("2026-01-16"); // JSTでの日付
    expect(runs[0].status).toBe("COMPLETED");
  });

  it("要件6: 翌日の指定時刻なら再び実行される", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const day1 = await runScheduledDailySearch(AT_0800_JST);
    expect(day1.ran).toBe(true);

    const day1Again = await runScheduledDailySearch(AT_0800_JST);
    expect(day1Again).toEqual({ ran: false, reason: "ALREADY_RAN_TODAY" });

    const day2 = await runScheduledDailySearch(NEXT_DAY_0800_JST);
    expect(day2.ran).toBe(true);

    const runs = await prisma.searchRun.findMany({ orderBy: { scheduledFor: "asc" } });
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.scheduledFor)).toEqual(["2026-01-16", "2026-01-17"]);
  });
});
