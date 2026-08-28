import { prisma } from "@/lib/prisma";
import { buildPropertyWhere } from "@/lib/propertyQuery";
import { calculateSimulation } from "@/lib/simulation";
import { notifyPropertyMatch } from "@/lib/notifications/notifyPropertyMatch";

/**
 * 新規作成された物件（ingestProperty()のcreated===trueの場合のみ呼び出すこと）を、
 * 有効な保存検索条件(SavedSearch)と照合し、一致すれば PropertyMatch を作成する。
 * 作成できた場合はそのまま notifyPropertyMatch() を呼び、有効な通知チャネル
 * （現時点ではメールのみ。STEP8）へも配信する。
 *
 * @@unique([propertyId, savedSearchId]) により、同じ物件×同じ保存検索条件の
 * 組み合わせは二重に作成されない（既に存在する場合はスキップする。メールもその分だけ
 * 送信されない）。
 *
 * この処理はベストエフォートの副次機能であり、失敗しても物件の取り込み自体を
 * 失敗させてはならないため、呼び出し側(ingestProperty)でtry/catchすること。
 * notifyPropertyMatch()自体も例外を投げない設計だが、念のためこの関数側でも
 * catchしており、通知（メール）の失敗がPropertyMatch作成の成否に影響することはない。
 *
 * 判定は2段階（STEP4/5）:
 *   1. DBのwhere句で判定できる条件（家賃・面積・民泊相談状況など）→ buildPropertyWhere()
 *   2. 最低期待月間利益（minMonthlyProfit）→ DBでは判定せず、既存のcalculateSimulation()と
 *      取込時に自動生成されるSimulationInputを使ってアプリケーション側で判定する
 *      （収益シミュレーションは物件詳細画面と同じロジックをそのまま使う）
 * 1を満たさない場合は2の計算自体を行わない（無駄な計算を避ける）。
 * 想定月間利益は物件単位で一度だけ計算し、2の判定とメール本文の両方に使い回す
 * （保存検索条件ごとに何度も計算し直さない）。
 */
export async function matchNewProperty(propertyId: number): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { simulationInput: true },
  });
  if (!property) return 0;

  const savedSearches = await prisma.savedSearch.findMany({ where: { enabled: true } });
  if (savedSearches.length === 0) return 0;

  const monthlyProfit = property.simulationInput
    ? calculateSimulation({
        rent: property.rent,
        managementFee: property.managementFee,
        nightlyPrice: property.simulationInput.nightlyPrice,
        occupancyRate: property.simulationInput.occupancyRate,
        utilityCost: property.simulationInput.utilityCost,
        cleaningCost: property.simulationInput.cleaningCost,
        suppliesCost: property.simulationInput.suppliesCost,
        otaFeeRate: property.simulationInput.otaFeeRate,
        otherCost: property.simulationInput.otherCost,
        initialCost: property.initialCost,
      }).monthlyProfit
    : null; // シミュレーション初期値が無い場合は判定不能（利益条件付きの検索とはマッチしない）

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
      minpakuConsultationStatus: search.minpakuConsultationStatus ?? undefined,
    });

    // 検索画面と全く同じ条件判定ロジック(buildPropertyWhere)を使い、
    // 「この物件がこの条件で検索したときにヒットするか」をそのまま問い合わせる。
    const isMatch = await prisma.property.count({ where: { ...where, id: propertyId } });
    if (isMatch === 0) continue;

    // 最低期待月間利益の判定（DBのwhere句ではなく、アプリケーション側で判定する）
    if (search.minMonthlyProfit !== null) {
      if (monthlyProfit === null || monthlyProfit < search.minMonthlyProfit) continue;
    }

    const existing = await prisma.propertyMatch.findUnique({
      where: { propertyId_savedSearchId: { propertyId, savedSearchId: search.id } },
    });
    if (existing) continue; // 重複防止（通常は新規物件のみ呼ばれるため発生しないが念のため）

    const match = await prisma.propertyMatch.create({
      data: { userId: search.userId, propertyId, savedSearchId: search.id },
    });
    matchCount++;

    await notifyPropertyMatch({ match, property, savedSearch: search, monthlyProfit }).catch(
      (error: unknown) => {
        console.warn(`保存検索条件「${search.name}」への通知処理に失敗しました:`, error);
      },
    );
  }

  return matchCount;
}
