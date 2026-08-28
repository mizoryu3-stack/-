import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { matchNewProperty } from "@/lib/notifications/matchSavedSearches";
import { fakeEmailAdapter } from "@/lib/notifications/email/adapters/fakeAdapter";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

// vitest.config.ts で EMAIL_PROVIDER=fake / NOTIFICATION_EMAIL_TO を設定済み。
// このファイルのテストはすべて fakeEmailAdapter を経由してメール送信の有無・内容を検証する。
beforeEach(resetDb);
beforeEach(() => fakeEmailAdapter.reset());
afterAll(() => prisma.$disconnect());

describe("メール通知(STEP8)", () => {
  it("要件1: PropertyMatch作成時にメール通知処理が呼ばれる", async () => {
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ name: "メール通知テスト物件A", city: "呉市", source: "test-src", externalId: "mail-int-1" }),
    );

    expect(result.matchCount).toBe(1);
    expect(fakeEmailAdapter.sentMessages).toHaveLength(1);
    expect(fakeEmailAdapter.sentMessages[0].text).toContain("メール通知テスト物件A");
  });

  it("要件2: 保存検索条件に一致しない場合はメール通知も送信されない", async () => {
    await prisma.savedSearch.create({ data: { name: "廿日市市限定", city: "廿日市市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-2" }),
    );

    expect(result.matchCount).toBe(0);
    expect(fakeEmailAdapter.sentMessages).toHaveLength(0);
  });

  it("要件3: 同一PropertyMatchの重複作成防止が維持され、メールも重複送信されない", async () => {
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-3" }),
    );
    expect(fakeEmailAdapter.sentMessages).toHaveLength(1);

    // 通常は新規物件のみ呼ばれるが、念のため再度明示的に呼んでも増えないことを確認
    const secondCallMatchCount = await matchNewProperty(result.propertyId);
    expect(secondCallMatchCount).toBe(0);
    expect(fakeEmailAdapter.sentMessages).toHaveLength(1); // 増えない

    const matches = await prisma.propertyMatch.findMany({ where: { propertyId: result.propertyId } });
    expect(matches).toHaveLength(1);
  });

  it("要件4: メール送信が失敗しても、PropertyMatch作成・物件登録自体は成功する", async () => {
    fakeEmailAdapter.shouldFail = true;
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    const result = await ingestProperty(
      makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-4" }),
    );

    expect(result.created).toBe(true);
    expect(result.matchCount).toBe(1); // PropertyMatchの作成自体はメール成否と無関係

    const property = await prisma.property.findUnique({ where: { id: result.propertyId } });
    expect(property).not.toBeNull(); // 物件登録も成功している

    const matches = await prisma.propertyMatch.findMany({ where: { propertyId: result.propertyId } });
    expect(matches).toHaveLength(1); // PropertyMatchも作成されている

    expect(fakeEmailAdapter.sentMessages).toHaveLength(0); // 送信自体は失敗として扱われる
  });

  it("要件6: メール送信先がNOTIFICATION_EMAIL_TOの値で正しく設定される", async () => {
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    await ingestProperty(makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-6" }));

    expect(fakeEmailAdapter.sentMessages).toHaveLength(1);
    expect(fakeEmailAdapter.sentMessages[0].to).toBe("test-notify@example.com");
  });

  it("要件7-a: EMAIL_PROVIDER未設定の場合でも例外にならず、PropertyMatch作成は成功する", async () => {
    const original = process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_PROVIDER;
    try {
      await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

      const result = await ingestProperty(
        makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-7a" }),
      );

      expect(result.matchCount).toBe(1);
      const matches = await prisma.propertyMatch.findMany({ where: { propertyId: result.propertyId } });
      expect(matches).toHaveLength(1);
    } finally {
      if (original === undefined) delete process.env.EMAIL_PROVIDER;
      else process.env.EMAIL_PROVIDER = original;
    }
  });

  it("要件7-b: NOTIFICATION_EMAIL_TO未設定の場合でも例外にならず、送信はスキップされる", async () => {
    const original = process.env.NOTIFICATION_EMAIL_TO;
    delete process.env.NOTIFICATION_EMAIL_TO;
    try {
      await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

      const result = await ingestProperty(
        makeRawListing({ city: "呉市", source: "test-src", externalId: "mail-int-7b" }),
      );

      expect(result.matchCount).toBe(1); // PropertyMatch自体は作成される
      expect(fakeEmailAdapter.sentMessages).toHaveLength(0); // 送信先未設定のため送信はされない
    } finally {
      if (original === undefined) delete process.env.NOTIFICATION_EMAIL_TO;
      else process.env.NOTIFICATION_EMAIL_TO = original;
    }
  });
});
