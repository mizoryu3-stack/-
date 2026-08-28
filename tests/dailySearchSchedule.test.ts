import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_USER_ID,
  getOrCreateDailySearchSchedule,
  updateDailySearchSchedule,
  isValidScheduleTime,
  isScheduledTimeNow,
} from "@/lib/schedule/dailySearchSchedule";
import { resetDb } from "./setup/resetDb";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("dailySearchSchedule", () => {
  it("要件1: 初期設定が正しく作成される（未保存の場合、既定値で新規作成される）", async () => {
    const schedule = await getOrCreateDailySearchSchedule();

    expect(schedule.userId).toBe(DEFAULT_USER_ID);
    expect(schedule.enabled).toBe(false);
    expect(schedule.time).toBe("08:00");
    expect(schedule.timezone).toBe("Asia/Tokyo");

    const count = await prisma.dailySearchSchedule.count();
    expect(count).toBe(1); // 呼ぶたびに増えない（1ユーザー1件）
  });

  it("要件2: ON/OFFを保存できる", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "09:30" });
    let schedule = await getOrCreateDailySearchSchedule();
    expect(schedule.enabled).toBe(true);

    await updateDailySearchSchedule({ enabled: false, time: "09:30" });
    schedule = await getOrCreateDailySearchSchedule();
    expect(schedule.enabled).toBe(false);
  });

  it("要件3: HH:mmを正しく保存できる", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "23:45" });
    const schedule = await getOrCreateDailySearchSchedule();
    expect(schedule.time).toBe("23:45");
  });

  it("要件4: 不正な時刻を拒否する", async () => {
    const invalidValues = ["25:00", "08:60", "8:00", "abc", "", "24:00", "08:0"];
    for (const value of invalidValues) {
      expect(isValidScheduleTime(value)).toBe(false);
      await expect(updateDailySearchSchedule({ enabled: true, time: value })).rejects.toThrow();
    }

    // 不正な値を投入しようとした結果、DBの値は変化していないこと
    const schedule = await getOrCreateDailySearchSchedule();
    expect(schedule.time).toBe("08:00");

    // 正常な境界値は受理される
    expect(isValidScheduleTime("00:00")).toBe(true);
    expect(isValidScheduleTime("23:59")).toBe(true);
  });

  it("要件6: default-userで既存設定を更新できる（同じユーザーへの2回目の保存は新規作成ではなく上書き）", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "07:00" });
    await updateDailySearchSchedule({ enabled: true, time: "20:15" });

    const count = await prisma.dailySearchSchedule.count();
    expect(count).toBe(1); // 上書きされ、行が増えない

    const schedule = await prisma.dailySearchSchedule.findUniqueOrThrow({
      where: { userId: DEFAULT_USER_ID },
    });
    expect(schedule.time).toBe("20:15");
  });

  it("要件7: 保存設定がdaily-search側から取得できる（getOrCreateDailySearchScheduleを通して）", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    // daily-search側が呼ぶ想定の取得関数で、保存した値がそのまま取得できることを確認
    const schedule = await getOrCreateDailySearchSchedule(DEFAULT_USER_ID);
    expect(schedule.enabled).toBe(true);
    expect(schedule.time).toBe("08:00");

    // STEP3で使う想定の判定関数(isScheduledTimeNow)も、保存された値を正しく評価できること
    expect(isScheduledTimeNow(schedule, new Date("2026-01-01T08:00:00+09:00"))).toBe(true);
    expect(isScheduledTimeNow(schedule, new Date("2026-01-01T09:00:00+09:00"))).toBe(false);

    const disabled = { ...schedule, enabled: false };
    expect(isScheduledTimeNow(disabled, new Date("2026-01-01T08:00:00+09:00"))).toBe(false);
  });
});
