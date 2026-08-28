import { NextRequest, NextResponse } from "next/server";
import { runScheduledDailySearch } from "@/lib/ingestion/runScheduledDailySearch";

/**
 * 日次自動探索のトリガー用エンドポイント（STEP1、STEP3でスケジュール判定を接続）。
 *
 * 外部スケジューラ（Vercel Cron / GitHub Actions の schedule / 自前サーバーのOS cron 等、
 * デプロイ先に応じて選定する）が毎分〜数分間隔でこのURLを叩く想定。このルート自体はcron機能を
 * 持たず、「叩かれるたびに、DailySearchScheduleに設定された時刻かどうかを確認し、
 * 該当すれば日次探索を1回だけ実行する」役割を持つ（判定本体は runScheduledDailySearch.ts）。
 * スケジュール未設定・OFF・時刻不一致・本日分は実行済み、のいずれの場合もエラーではなく
 * 200で「実行しなかった」ことを返す（理由はレスポンスとサーバーログの両方に残る）。
 *
 * 認証: `CRON_API_TOKEN` 環境変数が未設定の場合は誤って外部公開しないよう常に無効化する
 * （/api/properties/ingest と同じ安全側デフォルトの方針）。設定されている場合、
 * リクエストヘッダー `x-cron-token` の値と一致しなければ拒否する（STEP1から変更なし）。
 *
 * GET/POSTのどちらでも同じ処理を行う（スケジューラの実装によりどちらを使うか異なるため）。
 * Vercel Cron はGETでAuthorizationヘッダーを付けて呼ぶため、その場合はスケジューラ設定側で
 * `x-cron-token` ヘッダーを付与できるか確認すること（できない場合は別途対応が必要）。
 *
 * デバッグ用: リクエストヘッダー `x-cron-simulate-now`（ISO8601日時文字列）を付けると、
 * その日時を「現在時刻」とみなしてスケジュール判定を行う。認証を通過したリクエストのみが
 * 使えるため（＝CRON_API_TOKENを知っている呼び出し元のみ）、本番相当の環境でも
 * 実機テスト・動作確認に安全に使える。省略時は実際の現在時刻を使う。
 */
async function handleTrigger(req: NextRequest) {
  const token = process.env.CRON_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "この機能は現在無効です（CRON_API_TOKEN未設定）。" },
      { status: 501 },
    );
  }

  if (req.headers.get("x-cron-token") !== token) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  let now: Date | undefined;
  const simulateNowRaw = req.headers.get("x-cron-simulate-now");
  if (simulateNowRaw) {
    const parsed = new Date(simulateNowRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "x-cron-simulate-now はISO8601形式の日時で指定してください。" },
        { status: 400 },
      );
    }
    now = parsed;
  }

  try {
    const outcome = await runScheduledDailySearch(now);
    if (outcome.ran) {
      return NextResponse.json({ ran: true, ...outcome.summary }, { status: 200 });
    }
    return NextResponse.json({ ran: false, reason: outcome.reason }, { status: 200 });
  } catch (error) {
    // runScheduledDailySearch()・runDailySearch()自体はソース単位でエラーを吸収する設計だが、
    // DB接続断など想定外の失敗に備えて念のため二重に保護する。
    console.error("日次探索の実行中に予期しないエラーが発生しました:", error);
    return NextResponse.json(
      { error: "日次探索の実行中に予期しないエラーが発生しました。" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}
