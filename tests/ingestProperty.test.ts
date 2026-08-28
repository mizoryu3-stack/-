import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("ingestProperty", () => {
  it("新規物件を作成し、民泊適性スコア・掲載状態・民泊確認状況の初期値が正しく設定される", async () => {
    const result = await ingestProperty(
      makeRawListing({ source: "test-src", externalId: "ext-1" }),
    );

    expect(result.created).toBe(true);
    expect(result.duplicateCandidateCount).toBe(0);

    const property = await prisma.property.findUniqueOrThrow({ where: { id: result.propertyId } });
    expect(property.minpakuScore).toBeGreaterThan(0);
    expect(property.listingStatus).toBe("ACTIVE");
    // 指定しなかった場合、民泊確認状況は新規作成時のみUNKNOWNが既定値になる
    expect(property.minpakuConsultationStatus).toBe("UNKNOWN");
    expect(property.firstSeenAt).toBeInstanceOf(Date);
  });

  it("同一source+externalIdで再取込すると、新規作成ではなく更新として扱われる", async () => {
    const first = await ingestProperty(
      makeRawListing({ source: "test-src", externalId: "ext-2", rent: 60_000 }),
    );
    expect(first.created).toBe(true);

    const second = await ingestProperty(
      makeRawListing({ source: "test-src", externalId: "ext-2", rent: 65_000 }),
    );
    expect(second.created).toBe(false);
    expect(second.propertyId).toBe(first.propertyId);

    const count = await prisma.property.count({ where: { source: "test-src", externalId: "ext-2" } });
    expect(count).toBe(1);

    const property = await prisma.property.findUniqueOrThrow({ where: { id: first.propertyId } });
    expect(property.rent).toBe(65_000); // 家賃は更新されている
  });

  it("民泊確認状況を省略して再取込しても、既存の確認済み状態は維持される（意図せずUNKNOWNへ戻らない）", async () => {
    const first = await ingestProperty(
      makeRawListing({
        source: "test-src",
        externalId: "ext-3",
        minpakuConsultationStatus: "OWNER_CONFIRMED_AVAILABLE",
      }),
    );
    let property = await prisma.property.findUniqueOrThrow({ where: { id: first.propertyId } });
    expect(property.minpakuConsultationStatus).toBe("OWNER_CONFIRMED_AVAILABLE");

    // 民泊確認状況の列を持たない月次の再取込（rentのみ更新）を模擬
    await ingestProperty(makeRawListing({ source: "test-src", externalId: "ext-3", rent: 70_000 }));

    property = await prisma.property.findUniqueOrThrow({ where: { id: first.propertyId } });
    expect(property.minpakuConsultationStatus).toBe("OWNER_CONFIRMED_AVAILABLE");
    expect(property.rent).toBe(70_000);
  });

  it("listingStatusを明示指定すると、その値が反映される（例: 掲載終了への変更）", async () => {
    const first = await ingestProperty(makeRawListing({ source: "test-src", externalId: "ext-4" }));
    await ingestProperty(
      makeRawListing({ source: "test-src", externalId: "ext-4", listingStatus: "ENDED" }),
    );

    const property = await prisma.property.findUniqueOrThrow({ where: { id: first.propertyId } });
    expect(property.listingStatus).toBe("ENDED");
  });

  it("似た名前・住所の新規物件は自動統合せず、DuplicateCandidateとして記録される", async () => {
    await ingestProperty(
      makeRawListing({
        name: "呉中央マンション101",
        address: "広島県呉市中央1-1-1",
        source: "test-src",
        externalId: "ext-5",
      }),
    );

    const second = await ingestProperty(
      makeRawListing({
        name: "呉中央マンション101", // 同名（別ソース・別externalIdのため確実な一致にはならない）
        address: "広島県呉市中央1-1-1",
        source: "test-src-2",
        externalId: "ext-6",
      }),
    );

    // 自動統合しない → 2件とも別物件として存在する
    const totalProperties = await prisma.property.count();
    expect(totalProperties).toBe(2);
    expect(second.duplicateCandidateCount).toBeGreaterThan(0);

    const candidates = await prisma.duplicateCandidate.findMany({ where: { propertyId: second.propertyId } });
    expect(candidates.length).toBeGreaterThan(0);
  });
});
