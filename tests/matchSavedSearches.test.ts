import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { matchNewProperty } from "@/lib/notifications/matchSavedSearches";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("matchNewProperty", () => {
  it("有効な保存検索条件に一致する新規物件はPropertyMatchを生成する", async () => {
    // 保存検索条件が存在しない状態で先に物件を取り込む
    // （ingestProperty()内部の自動マッチで消費されてしまわないよう、matchNewProperty()を
    //  この後で明示的に1回だけ呼ぶ形にして、その戻り値・副作用だけを検証する）
    const result = await ingestProperty(
      makeRawListing({ city: "呉市", rent: 60_000, source: "test-src", externalId: "m-1" }),
    );
    const search = await prisma.savedSearch.create({
      data: { name: "呉市・8万円以下", city: "呉市", rentMax: 80_000, enabled: true },
    });

    const matchCount = await matchNewProperty(result.propertyId);

    expect(matchCount).toBe(1);
    const matches = await prisma.propertyMatch.findMany({ where: { savedSearchId: search.id } });
    expect(matches).toHaveLength(1);
    expect(matches[0].propertyId).toBe(result.propertyId);
    expect(matches[0].readAt).toBeNull();
  });

  it("無効化(enabled:false)された保存検索条件は対象にならない", async () => {
    await prisma.savedSearch.create({
      data: { name: "無効な条件", city: "呉市", enabled: false },
    });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-2" }),
    );
    const matchCount = await matchNewProperty(result.propertyId);

    expect(matchCount).toBe(0);
    const matches = await prisma.propertyMatch.findMany();
    expect(matches).toHaveLength(0);
  });

  it("条件に一致しない物件はマッチしない", async () => {
    await prisma.savedSearch.create({
      data: { name: "廿日市市限定", city: "廿日市市", enabled: true },
    });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-3" }),
    );
    const matchCount = await matchNewProperty(result.propertyId);

    expect(matchCount).toBe(0);
  });

  it("同じ物件×同じ保存検索条件の組み合わせで重複したPropertyMatchは作られない", async () => {
    const search = await prisma.savedSearch.create({
      data: { name: "呉市", city: "呉市", enabled: true },
    });
    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-4" }),
    );

    await matchNewProperty(result.propertyId);
    const secondCallMatchCount = await matchNewProperty(result.propertyId); // 通常は新規物件のみ呼ばれるが、念のための重複防止を確認

    expect(secondCallMatchCount).toBe(0);
    const matches = await prisma.propertyMatch.findMany({
      where: { propertyId: result.propertyId, savedSearchId: search.id },
    });
    expect(matches).toHaveLength(1);
  });

  // --- STEP4: 民泊相談状況条件 ---

  it("民泊相談状況条件を指定しない場合、従来通り（状況によらず）マッチする", async () => {
    await prisma.savedSearch.create({ data: { name: "指定なし", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-6",
        minpakuConsultationStatus: "NOT_AVAILABLE",
      }),
    );
    expect(result.matchCount).toBe(1);
  });

  it("民泊相談状況条件を指定すると、一致しない物件はマッチしない", async () => {
    await prisma.savedSearch.create({
      data: {
        name: "確認済みのみ",
        city: "呉市",
        enabled: true,
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
      },
    });

    const unmatched = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-7",
        minpakuConsultationStatus: "OWNER_CONFIRM_REQUIRED",
      }),
    );
    expect(unmatched.matchCount).toBe(0);

    const matched = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-8",
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
      }),
    );
    expect(matched.matchCount).toBe(1);
  });

  // --- STEP5: 最低期待月間利益条件 ---
  // makeRawListing()の既定値（家賃60,000円等）で ingestProperty() が自動生成する
  // SimulationInputから calculateSimulation() すると、想定月間利益は22,500円になる。

  it("最低期待月間利益を指定しない場合、従来通り（利益によらず）マッチする", async () => {
    await prisma.savedSearch.create({ data: { name: "指定なし", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-9" }),
    );
    expect(result.matchCount).toBe(1);
  });

  it("想定月間利益が最低期待利益以上の場合はマッチする", async () => {
    await prisma.savedSearch.create({
      data: { name: "利益2万円以上", city: "呉市", enabled: true, minMonthlyProfit: 20_000 },
    });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-10" }),
    );
    expect(result.matchCount).toBe(1);
  });

  it("想定月間利益が最低期待利益未満の場合はマッチしない", async () => {
    await prisma.savedSearch.create({
      data: { name: "利益2.5万円以上", city: "呉市", enabled: true, minMonthlyProfit: 25_000 },
    });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-11" }),
    );
    expect(result.matchCount).toBe(0);
  });

  it("民泊相談状況条件と利益条件の両方を満たした場合のみマッチする", async () => {
    await prisma.savedSearch.create({
      data: {
        name: "確認済みかつ利益2万円以上",
        city: "呉市",
        enabled: true,
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
        minMonthlyProfit: 20_000,
      },
    });

    // 民泊条件は満たすが利益条件を満たさない
    // （nightlyPriceは家賃から簡易推定されるため、家賃を下げると想定利益もマイナス側に下がる）
    const profitOnly = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-12",
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
        rent: 30_000,
      }),
    );
    expect(profitOnly.matchCount).toBe(0);

    // 利益条件は満たすが民泊条件を満たさない
    const minpakuOnly = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-13",
        minpakuConsultationStatus: "OWNER_CONFIRM_REQUIRED",
      }),
    );
    expect(minpakuOnly.matchCount).toBe(0);

    // 両方満たす
    const both = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-14",
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
      }),
    );
    expect(both.matchCount).toBe(1);
  });

  it("民泊条件・利益条件を設定した保存検索条件でも、重複通知防止は維持される", async () => {
    const search = await prisma.savedSearch.create({
      data: {
        name: "確認済みかつ利益2万円以上",
        city: "呉市",
        enabled: true,
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
        minMonthlyProfit: 20_000,
      },
    });

    const result = await ingestProperty(
      makeRawListing({
        city: "呉市",
        source: "test-src",
        externalId: "m-15",
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
      }),
    );
    expect(result.matchCount).toBe(1); // ingestProperty()内部の自動マッチで1件生成される

    const secondCallMatchCount = await matchNewProperty(result.propertyId); // 明示的に再度呼んでも増えない
    expect(secondCallMatchCount).toBe(0);

    const matches = await prisma.propertyMatch.findMany({
      where: { propertyId: result.propertyId, savedSearchId: search.id },
    });
    expect(matches).toHaveLength(1);
  });

  it("ingestProperty()自体が、新規作成かつ条件一致の場合にmatchCountを返す", async () => {
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "m-5" }),
    );
    expect(result.matchCount).toBe(1);

    // 既存物件の更新（家賃変更のみ）では新着通知を生成しない
    const updateResult = await ingestProperty(
      makeRawListing({ city: "呉市", rent: 99_000, source: "test-src", externalId: "m-5" }),
    );
    expect(updateResult.created).toBe(false);
    expect(updateResult.matchCount).toBe(0);
  });
});
