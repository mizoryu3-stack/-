import { prisma } from "@/lib/prisma";

/**
 * 掲載状態の自動照合処理。
 *
 * `src/lib/ingestion/runDailySearch.ts`（日次自動探索、`/api/cron/daily-search`から呼ばれる）
 * から、pull型ソースごとに1回ずつ呼び出される:
 *   ソースから取得 → ingestProperty()で取込（見えた物件はlastSeenAt等が自動更新される）
 *                  → reconcileListingStatus(source, 今回見えたexternalIdの一覧)
 *                  → このソースで見えなくなった物件をUNKNOWNへ
 *
 * 現時点では PROVIDER_REGISTRY に connected:true な pull型ソースが存在しないため、
 * 実運用でこの関数が呼ばれることはまだない（ロジック自体はいつでも呼び出し可能な状態）。
 *
 * 意図的に単純な実装に留めている点（STEP7以降、実際の運用規模に応じて見直す想定）:
 *  - ENDEDへの格上げ（何回連続で見つからなかったら確定とするか等）は行わず、UNKNOWNへの
 *    遷移のみ行う。
 *  - `notIn: seenExternalIds` はソースの物件数が大きくなるとSQLが肥大化しうるが、
 *    現状の規模（プロトタイプ・実データソース0件）では問題にならないため対応していない。
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
