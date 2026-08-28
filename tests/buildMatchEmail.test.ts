import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { buildMatchEmailMessage } from "@/lib/notifications/email/buildMatchEmail";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("buildMatchEmailMessage", () => {
  it("物件名・所在地・家賃・面積・民泊相談状況・期待月間利益・詳細リンクを本文に含む（要件5）", async () => {
    const result = await ingestProperty(
      makeRawListing({
        name: "メール本文検証物件",
        address: "広島県呉市中央1-2-3",
        rent: 60_000,
        areaSqm: 25,
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
        source: "test-src",
        externalId: "mail-1",
      }),
    );
    const property = await prisma.property.findUniqueOrThrow({ where: { id: result.propertyId } });
    const savedSearch = await prisma.savedSearch.create({
      data: { name: "メールテスト用条件", city: "呉市" },
    });

    const message = buildMatchEmailMessage({
      to: "test-notify@example.com",
      property,
      savedSearch,
      monthlyProfit: 22_500,
    });

    expect(message.to).toBe("test-notify@example.com");
    expect(message.subject).toContain("メール本文検証物件");
    expect(message.text).toContain("メール本文検証物件"); // 物件名
    expect(message.text).toContain("広島県呉市中央1-2-3"); // 所在地
    expect(message.text).toContain("60,000円"); // 家賃
    expect(message.text).toContain("25m²"); // 面積
    expect(message.text).toContain("オーナー確認済み・相談可能"); // 民泊相談状況
    expect(message.text).toContain("22,500円"); // 期待月間利益
    expect(message.text).toMatch(/\d+点/); // 民泊適性スコア（主要情報）
    expect(message.text).toContain(`/properties/${property.id}`); // 詳細ページへのリンク
  });

  it("想定月間利益が算出できない場合でもエラーにならず、その旨を本文に含める", async () => {
    const result = await ingestProperty(makeRawListing({ source: "test-src", externalId: "mail-2" }));
    const property = await prisma.property.findUniqueOrThrow({ where: { id: result.propertyId } });
    const savedSearch = await prisma.savedSearch.create({ data: { name: "条件" } });

    const message = buildMatchEmailMessage({
      to: "test-notify@example.com",
      property,
      savedSearch,
      monthlyProfit: null,
    });

    expect(message.text).toContain("算出できませんでした");
  });
});
