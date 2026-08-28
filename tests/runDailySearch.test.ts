import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { runDailySearch } from "@/lib/ingestion/runDailySearch";
import type { ProviderInfo } from "@/lib/ingestion/providers/registry";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("runDailySearch", () => {
  it("対象ソースが0件（現状のPROVIDER_REGISTRYのデフォルト）でも正常にCOMPLETEDで終了する", async () => {
    const summary = await runDailySearch([]);

    expect(summary.status).toBe("COMPLETED");
    expect(summary.sourceCount).toBe(0);
    expect(summary.succeededSources).toBe(0);
    expect(summary.failedSources).toBe(0);
    expect(summary.fetchedCount).toBe(0);
    expect(summary.sources).toHaveLength(0);

    const run = await prisma.searchRun.findUniqueOrThrow({ where: { id: summary.searchRunId } });
    expect(run.status).toBe("COMPLETED");
    expect(run.sourceCount).toBe(0);
    expect(run.finishedAt).not.toBeNull();
  });

  it("1ソースが失敗しても他のソースの処理は継続し、全体はCOMPLETEDになる", async () => {
    const okProvider: ProviderInfo = {
      id: "fake-ok",
      name: "テスト用OKソース",
      kind: "pull",
      connected: true,
      description: "test",
      fetch: async () => [makeRawListing({ source: "fake-ok", externalId: "f-1" })],
    };
    const ngProvider: ProviderInfo = {
      id: "fake-ng",
      name: "テスト用NGソース",
      kind: "pull",
      connected: true,
      description: "test",
      fetch: async () => {
        throw new Error("接続エラー（テスト用）");
      },
    };

    const summary = await runDailySearch([okProvider, ngProvider]);

    expect(summary.status).toBe("COMPLETED");
    expect(summary.sourceCount).toBe(2);
    expect(summary.succeededSources).toBe(1);
    expect(summary.failedSources).toBe(1);
    expect(summary.createdCount).toBe(1);

    const ok = summary.sources.find((s) => s.source === "fake-ok");
    const ng = summary.sources.find((s) => s.source === "fake-ng");
    expect(ok?.status).toBe("SUCCEEDED");
    expect(ok?.createdCount).toBe(1);
    expect(ng?.status).toBe("FAILED");
    expect(ng?.errorMessage).toContain("接続エラー");

    // 実際に物件が1件取り込まれていること
    const propertyCount = await prisma.property.count({ where: { source: "fake-ok" } });
    expect(propertyCount).toBe(1);
  });

  it("対象ソースが1件以上あって全て失敗した場合はFAILEDになる", async () => {
    const ngProvider: ProviderInfo = {
      id: "fake-ng-only",
      name: "テスト用NGソース",
      kind: "pull",
      connected: true,
      description: "test",
      fetch: async () => {
        throw new Error("全滅テスト");
      },
    };

    const summary = await runDailySearch([ngProvider]);
    expect(summary.status).toBe("FAILED");
    expect(summary.failedSources).toBe(1);
    expect(summary.succeededSources).toBe(0);
  });

  it("新着物件が保存検索条件に一致すればmatchCountに反映される", async () => {
    await prisma.savedSearch.create({ data: { name: "呉市", city: "呉市", enabled: true } });

    const provider: ProviderInfo = {
      id: "fake-match",
      name: "テスト用ソース",
      kind: "pull",
      connected: true,
      description: "test",
      fetch: async () => [
        makeRawListing({ city: "呉市", source: "fake-match", externalId: "fm-1" }),
      ],
    };

    const summary = await runDailySearch([provider]);
    expect(summary.matchCount).toBe(1);
    expect(summary.sources[0].matchCount).toBe(1);
  });

  it("不正な物件データ（バリデーションエラー）はerrorCountに計上され、取込はスキップされる", async () => {
    const provider: ProviderInfo = {
      id: "fake-invalid",
      name: "テスト用ソース",
      kind: "pull",
      connected: true,
      description: "test",
      // @ts-expect-error 意図的に必須フィールド(rent)を欠いた不正データをテストする
      fetch: async () => [{ ...makeRawListing({ source: "fake-invalid" }), rent: undefined }],
    };

    const summary = await runDailySearch([provider]);
    expect(summary.errorCount).toBe(1);
    expect(summary.createdCount).toBe(0);
    const propertyCount = await prisma.property.count({ where: { source: "fake-invalid" } });
    expect(propertyCount).toBe(0);
  });
});
