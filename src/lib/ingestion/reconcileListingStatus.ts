import { prisma } from "@/lib/prisma";

/**
 * 【未接続】掲載状態の自動照合処理の骨組み。
 *
 * 想定しているフロー（実際の自動実行バッチ・cron等は未実装）:
 *   外部データ取得 → 既存物件と照合 → 掲載中なら lastSeenAt 更新
 *                                    → 一定期間確認できなければ ENDED または UNKNOWN
 *
 * 使い方のイメージ（将来、外部ソースのバッチ取込が実装されたら）:
 * ```ts
 * const listings = await fetchSuumoListings(); // 例: 将来のアダプタ
 * for (const listing of listings) {
 *   await ingestProperty(listing); // ここで lastSeenAt 等は自動更新される
 * }
 * await reconcileListingStatus("suumo", listings.map((l) => l.externalId).filter(Boolean));
 * ```
 *
 * externalId を持たない手入力データ(source = "manual")は対象外
 * （そもそも自動照合の対象になり得ないため）。
 */
export async function reconcileListingStatus(
  source: string,
  seenExternalIds: string[],
): Promise<{ markedUnknown: number }> {
  if (seenExternalIds.length === 0) {
    // 空配列を渡すと全件が「見つからなかった」扱いになってしまうため、
    // 誤操作防止のため明示的に何もしない（安全側に倒す）。
    return { markedUnknown: 0 };
  }

  // 今回のバッチで見つからなかった、この source に属する既存物件を UNKNOWN にする。
  // ENDED への格上げ（何回連続で見つからなかったら確定とするか等）は未実装。
  // 呼び出し側の運用が固まった段階で、lastCheckedAt の経過日数などを見て判断する想定。
  const result = await prisma.property.updateMany({
    where: {
      source,
      externalId: { not: null, notIn: seenExternalIds },
      listingStatus: { not: "UNKNOWN" },
    },
    data: { listingStatus: "UNKNOWN", lastCheckedAt: new Date() },
  });

  return { markedUnknown: result.count };
}
