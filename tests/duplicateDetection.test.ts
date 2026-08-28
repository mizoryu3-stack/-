import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { findConfidentMatch, findDuplicateCandidates } from "@/lib/ingestion/duplicateDetection";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("duplicateDetection", () => {
  describe("findConfidentMatch", () => {
    it("source+externalIdが一致する既存物件を確実な一致として返す", async () => {
      const existing = await ingestProperty(
        makeRawListing({ source: "dup-test", externalId: "ext-100" }),
      );

      const match = await findConfidentMatch(
        makeRawListing({ source: "dup-test", externalId: "ext-100", name: "別の名前でも一致する" }),
      );
      expect(match?.id).toBe(existing.propertyId);
    });

    it("sourceUrlが一致する既存物件を確実な一致として返す", async () => {
      const url = "https://example.com/listing/1";
      const existing = await ingestProperty(
        makeRawListing({ source: "dup-test", externalId: "ext-101", sourceUrl: url }),
      );

      const match = await findConfidentMatch(
        makeRawListing({ source: "dup-test", externalId: "different-id", sourceUrl: url }),
      );
      expect(match?.id).toBe(existing.propertyId);
    });

    it("一致する情報が無ければnullを返す", async () => {
      await ingestProperty(makeRawListing({ source: "dup-test", externalId: "ext-102" }));

      const match = await findConfidentMatch(
        makeRawListing({ source: "dup-test", externalId: "ext-999" }),
      );
      expect(match).toBeNull();
    });
  });

  describe("findDuplicateCandidates", () => {
    it("同一市区町村・同一建物種別で名前が酷似していれば候補として検出する", async () => {
      await ingestProperty(
        makeRawListing({
          name: "呉中央マンション101",
          address: "広島県呉市中央1-1-1",
          source: "dup-test",
          externalId: "ext-103",
        }),
      );

      const candidates = await findDuplicateCandidates(
        makeRawListing({
          name: "呉中央マンション101",
          address: "広島県呉市中央1-1-1",
          source: "dup-test-2",
          externalId: "ext-104",
        }),
      );
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].similarity).toBeGreaterThanOrEqual(0.6);
    });

    it("名前も住所も全く異なっていれば候補として検出しない", async () => {
      await ingestProperty(
        makeRawListing({
          name: "音戸ビューハウス",
          address: "広島県呉市音戸町北隠渡9-9-9",
          source: "dup-test",
          externalId: "ext-105",
        }),
      );

      const candidates = await findDuplicateCandidates(
        makeRawListing({
          name: "全く別物件です",
          address: "広島県呉市中央2-2-2",
          source: "dup-test-2",
          externalId: "ext-106",
        }),
      );
      expect(candidates.length).toBe(0);
    });
  });
});
