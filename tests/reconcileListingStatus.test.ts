import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { reconcileListingStatus } from "@/lib/ingestion/reconcileListingStatus";
import { resetDb } from "./setup/resetDb";
import { makeRawListing } from "./helpers/fixtures";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("reconcileListingStatus", () => {
  it("今回のバッチで見えなかった同ソースの物件をUNKNOWNにする", async () => {
    const seen = await ingestProperty(
      makeRawListing({ source: "reconcile-src", externalId: "r-1" }),
    );
    const notSeen = await ingestProperty(
      makeRawListing({ source: "reconcile-src", externalId: "r-2" }),
    );

    const result = await reconcileListingStatus("reconcile-src", ["r-1"]);
    expect(result.markedUnknown).toBe(1);

    const seenProperty = await prisma.property.findUniqueOrThrow({ where: { id: seen.propertyId } });
    const notSeenProperty = await prisma.property.findUniqueOrThrow({ where: { id: notSeen.propertyId } });
    expect(seenProperty.listingStatus).toBe("ACTIVE"); // 今回も見えた物件は変化しない
    expect(notSeenProperty.listingStatus).toBe("UNKNOWN"); // 見えなかった物件はUNKNOWNへ
  });

  it("空配列を渡した場合は安全のため何もしない", async () => {
    await ingestProperty(makeRawListing({ source: "reconcile-src", externalId: "r-3" }));

    const result = await reconcileListingStatus("reconcile-src", []);
    expect(result.markedUnknown).toBe(0);

    const property = await prisma.property.findFirstOrThrow({
      where: { source: "reconcile-src", externalId: "r-3" },
    });
    expect(property.listingStatus).toBe("ACTIVE");
  });

  it("externalIdを持たない物件（手入力データ相当）は対象外", async () => {
    await ingestProperty(makeRawListing({ source: "manual-like" })); // externalId省略

    const result = await reconcileListingStatus("manual-like", ["dummy-id"]);
    expect(result.markedUnknown).toBe(0);

    const property = await prisma.property.findFirstOrThrow({ where: { source: "manual-like" } });
    expect(property.listingStatus).toBe("ACTIVE");
  });

  it("他ソースの物件には影響しない", async () => {
    const otherSource = await ingestProperty(
      makeRawListing({ source: "other-src", externalId: "o-1" }),
    );

    await reconcileListingStatus("reconcile-src", ["nothing-matches"]);

    const property = await prisma.property.findUniqueOrThrow({ where: { id: otherSource.propertyId } });
    expect(property.listingStatus).toBe("ACTIVE");
  });
});
