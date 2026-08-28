import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/cron/daily-search/route";
import { updateDailySearchSchedule } from "@/lib/schedule/dailySearchSchedule";
import { resetDb } from "./setup/resetDb";

const ROUTE_URL = "http://localhost/api/cron/daily-search";

function callRoute(headers: Record<string, string> = {}) {
  return GET(new NextRequest(ROUTE_URL, { headers }));
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("GET /api/cron/daily-search（認証まわり。STEP1から挙動を変更していないことの確認）", () => {
  const originalToken = process.env.CRON_API_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.CRON_API_TOKEN;
    else process.env.CRON_API_TOKEN = originalToken;
  });

  it("要件8: CRON_API_TOKEN未設定の場合は501", async () => {
    delete process.env.CRON_API_TOKEN;

    const res = await callRoute({ "x-cron-token": "anything" });

    expect(res.status).toBe(501);
  });

  it("要件7: トークン不一致の場合は401", async () => {
    process.env.CRON_API_TOKEN = "correct-token";

    const res = await callRoute({ "x-cron-token": "wrong-token" });

    expect(res.status).toBe(401);
  });

  it("要件7: トークン未指定の場合も401", async () => {
    process.env.CRON_API_TOKEN = "correct-token";

    const res = await callRoute();

    expect(res.status).toBe(401);
  });

  it("要件9: 正しいトークンなら200で正常処理される（スケジュール未設定のためran:falseが返る）", async () => {
    process.env.CRON_API_TOKEN = "correct-token";

    const res = await callRoute({ "x-cron-token": "correct-token" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ran: false, reason: "NO_SCHEDULE" });
  });
});

describe("GET /api/cron/daily-search（スケジュール実行。x-cron-simulate-nowでの実機相当確認）", () => {
  const originalToken = process.env.CRON_API_TOKEN;

  beforeEach(() => {
    process.env.CRON_API_TOKEN = "correct-token";
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.CRON_API_TOKEN;
    else process.env.CRON_API_TOKEN = originalToken;
  });

  it("設定時刻(08:00 JST)をx-cron-simulate-nowで指定すると実行され、SearchRunが1件作成される", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const res = await callRoute({
      "x-cron-token": "correct-token",
      "x-cron-simulate-now": "2026-01-15T23:00:00Z", // = 2026-01-16 08:00 JST
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ran).toBe(true);

    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(1);
  });

  it("同じ条件でもう一度呼んでもSearchRunは増えない", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });
    const headers = {
      "x-cron-token": "correct-token",
      "x-cron-simulate-now": "2026-01-15T23:00:00Z",
    };

    await callRoute(headers);
    const secondRes = await callRoute(headers);

    expect(secondRes.status).toBe(200);
    const body = await secondRes.json();
    expect(body).toEqual({ ran: false, reason: "ALREADY_RAN_TODAY" });

    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(1);
  });

  it("時刻を1分後(08:01 JST)にすると実行されない", async () => {
    await updateDailySearchSchedule({ enabled: true, time: "08:00" });

    const res = await callRoute({
      "x-cron-token": "correct-token",
      "x-cron-simulate-now": "2026-01-15T23:01:00Z", // = 2026-01-16 08:01 JST
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ran: false, reason: "NOT_SCHEDULED_TIME" });

    const runs = await prisma.searchRun.findMany();
    expect(runs).toHaveLength(0);
  });

  it("x-cron-simulate-nowが不正な日時形式の場合は400", async () => {
    const res = await callRoute({
      "x-cron-token": "correct-token",
      "x-cron-simulate-now": "not-a-date",
    });

    expect(res.status).toBe(400);
  });
});
