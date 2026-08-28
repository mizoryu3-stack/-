import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { reconcileListingStatus } from "@/lib/ingestion/reconcileListingStatus";
import { validateRawListing } from "@/lib/ingestion/types";
import { getConnectedPullProviders, type ProviderInfo } from "@/lib/ingestion/providers/registry";

export interface SourceRunSummary {
  source: string;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  matchCount: number;
  markedUnknownCount: number;
}

export interface DailySearchSummary {
  searchRunId: number;
  status: "COMPLETED" | "FAILED";
  startedAt: Date;
  finishedAt: Date;
  sourceCount: number;
  succeededSources: number;
  failedSources: number;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  matchCount: number;
  sources: SourceRunSummary[];
}

export interface RunDailySearchOptions {
  /**
   * STEP3: スケジュール実行（runScheduledDailySearch.ts）からのみ指定する。
   * SearchRun.scheduledFor（"YYYY-MM-DD"、DailySearchSchedule.timezone基準）に記録され、
   * DBのUNIQUE制約により同じ日のスケジュール実行が二重に作成されることを防ぐ。
   * 手動実行・テスト等では省略し、scheduledForはnullのまま（制約の対象外）にする。
   */
  scheduledFor?: string;
}

/**
 * 日次自動探索（STEP1）の本体。
 *
 * 流れ：
 *   PROVIDER_REGISTRYの「接続済みpull型ソース」を1件ずつ取得
 *     → 各物件を validateRawListing() → ingestProperty() で取込
 *       （重複判定・公的データ取得・スコア計算・掲載状態更新・保存検索条件との照合まで
 *        ingestProperty() 内部で行われる。ここでは呼ぶだけでよい）
 *     → 取得できたexternalIdの一覧で reconcileListingStatus() を呼び、
 *       このソースで見えなくなった物件を UNKNOWN にする（STEP6）
 *   → 結果を SearchRun / SearchRunSource として記録
 *
 * 設計上の要点:
 *  - 1ソースの取得・取込処理が例外を投げても、他のソースの処理は継続する
 *    （ソース単位でtry/catchし、失敗したソースはFAILEDとして記録するのみ）。
 *  - 対象ソースが0件（現時点のデフォルト。実データソース未接続のため）でも、
 *    sourceCount=0・status=COMPLETEDのSearchRunとして正常終了する。
 *  - providers引数はテスト用の差し込み口。省略時は実際のPROVIDER_REGISTRYから
 *    connected:true && kind:"pull" のソースを取得する（getConnectedPullProviders()）。
 *    新しいソースが正式接続されても、この関数・呼び出し元(APIルート)のコードは
 *    変更不要（レジストリ側でfetchを登録しconnectedをtrueにするだけでよい）。
 */
export async function runDailySearch(
  providers: ProviderInfo[] = getConnectedPullProviders(),
  options?: RunDailySearchOptions,
): Promise<DailySearchSummary> {
  const startedAt = new Date();

  // scheduledForを指定した場合、この create() 自体がUNIQUE制約違反(P2002)で失敗しうる
  // （＝同じ日のスケジュール実行が既に存在する）。呼び出し元(runScheduledDailySearch.ts)で
  // その例外を捕捉し、「二重実行としてスキップ」と判定する。
  const run = await prisma.searchRun.create({
    data: { startedAt, status: "RUNNING", sourceCount: providers.length, scheduledFor: options?.scheduledFor },
  });

  const sourceSummaries: SourceRunSummary[] = [];
  let succeededSources = 0;
  let failedSources = 0;
  let fetchedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let matchCount = 0;

  for (const provider of providers) {
    try {
      const listings = await provider.fetch!();

      let sCreated = 0;
      let sUpdated = 0;
      let sErrors = 0;
      let sMatches = 0;
      const seenExternalIds: string[] = [];

      for (const raw of listings) {
        const validationErrors = validateRawListing(raw);
        if (validationErrors.length > 0) {
          sErrors++;
          continue;
        }
        if (raw.externalId) seenExternalIds.push(raw.externalId);

        try {
          const result = await ingestProperty(raw);
          if (result.created) sCreated++;
          else sUpdated++;
          sMatches += result.matchCount;
        } catch (error) {
          sErrors++;
          console.warn(`日次探索: ${provider.id} の1件の取込に失敗しました:`, error);
        }
      }

      // 掲載状態の自動照合（STEP6）。externalIdを持たない物件は対象外（関数側で保証済み）。
      const reconcileResult = await reconcileListingStatus(provider.id, seenExternalIds).catch(
        (error: unknown) => {
          console.warn(`日次探索: ${provider.id} の掲載状態照合に失敗しました:`, error);
          return { markedUnknown: 0 };
        },
      );

      const summary: SourceRunSummary = {
        source: provider.id,
        status: "SUCCEEDED",
        fetchedCount: listings.length,
        createdCount: sCreated,
        updatedCount: sUpdated,
        errorCount: sErrors,
        matchCount: sMatches,
        markedUnknownCount: reconcileResult.markedUnknown,
      };
      sourceSummaries.push(summary);
      succeededSources++;
      fetchedCount += summary.fetchedCount;
      createdCount += summary.createdCount;
      updatedCount += summary.updatedCount;
      errorCount += summary.errorCount;
      matchCount += summary.matchCount;
    } catch (error) {
      // このソースの取得自体（provider.fetch()）が失敗したケース。
      // 他のソースの処理は継続するため、ここで止めずにFAILEDとして記録するだけにする。
      failedSources++;
      sourceSummaries.push({
        source: provider.id,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "不明なエラー",
        fetchedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        matchCount: 0,
        markedUnknownCount: 0,
      });
      console.warn(`日次探索: ソース「${provider.id}」の処理が失敗しました:`, error);
    }
  }

  const finishedAt = new Date();
  // 対象ソースが0件、または1件以上あって一部でも成功していればCOMPLETED。
  // 対象ソースが1件以上あるのに全て失敗した場合のみFAILEDとする。
  const status: "COMPLETED" | "FAILED" =
    providers.length > 0 && failedSources === providers.length ? "FAILED" : "COMPLETED";

  await prisma.$transaction([
    prisma.searchRun.update({
      where: { id: run.id },
      data: {
        finishedAt,
        status,
        succeededSources,
        failedSources,
        fetchedCount,
        createdCount,
        updatedCount,
        errorCount,
        matchCount,
      },
    }),
    ...(sourceSummaries.length > 0
      ? [
          prisma.searchRunSource.createMany({
            data: sourceSummaries.map((s) => ({ ...s, searchRunId: run.id })),
          }),
        ]
      : []),
  ]);

  return {
    searchRunId: run.id,
    status,
    startedAt,
    finishedAt,
    sourceCount: providers.length,
    succeededSources,
    failedSources,
    fetchedCount,
    createdCount,
    updatedCount,
    errorCount,
    matchCount,
    sources: sourceSummaries,
  };
}
