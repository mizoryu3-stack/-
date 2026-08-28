import { prisma } from "@/lib/prisma";
import { buildPropertyWhere } from "@/lib/propertyQuery";

/**
 * 新規作成された物件（ingestProperty()のcreated===trueの場合のみ呼び出すこと）を、
 * 有効な保存検索条件(SavedSearch)と照合し、一致すれば PropertyMatch を作成する。
 *
 * 想定している将来のフロー:
 *   CSV/APIから物件を取込 → 新規物件判定(created) → ここで保存検索条件と照合
 *   → PropertyMatch作成 → （未実装）メール/Push通知
 * 今回はPropertyMatchの作成までを行い、メール/Push送信は行わない。
 *
 * @@unique([propertyId, savedSearchId]) により、同じ物件×同じ保存検索条件の
 * 組み合わせは二重に作成されない（既に存在する場合はスキップする）。
 *
 * この処理はベストエフォートの副次機能であり、失敗しても物件の取り込み自体を
 * 失敗させてはならないため、呼び出し側(ingestProperty)でtry/catchすること。
 */
export async function matchNewProperty(propertyId: number): Promise<number> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return 0;

  const savedSearches = await prisma.savedSearch.findMany({ where: { enabled: true } });
  if (savedSearches.length === 0) return 0;

  let matchCount = 0;

  for (const search of savedSearches) {
    const where = buildPropertyWhere({
      city: search.city ?? undefined,
      rentMax: search.rentMax ?? undefined,
      buildingType: search.buildingType ?? undefined,
      areaSqmMin: search.areaSqmMin ?? undefined,
      maxAge: search.maxAge ?? undefined,
      stationWalkMax: search.stationWalkMax ?? undefined,
      hasParking: search.hasParking === true ? true : undefined,
    });

    // 検索画面と全く同じ条件判定ロジック(buildPropertyWhere)を使い、
    // 「この物件がこの条件で検索したときにヒットするか」をそのまま問い合わせる。
    const isMatch = await prisma.property.count({ where: { ...where, id: propertyId } });
    if (isMatch === 0) continue;

    const existing = await prisma.propertyMatch.findUnique({
      where: { propertyId_savedSearchId: { propertyId, savedSearchId: search.id } },
    });
    if (existing) continue; // 重複防止（通常は新規物件のみ呼ばれるため発生しないが念のため）

    await prisma.propertyMatch.create({
      data: { userId: search.userId, propertyId, savedSearchId: search.id },
    });
    matchCount++;
  }

  return matchCount;
}
