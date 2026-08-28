import { NextRequest, NextResponse } from "next/server";
import { runDailySearch } from "@/lib/ingestion/runDailySearch";

/**
 * 日次自動探索のトリガー用エンドポイント（STEP1）。
 *
 * 外部スケジューラ（Vercel Cron / GitHub Actions の schedule / 自前サーバーのOS cron 等、
 * デプロイ先に応じて選定する）が1日1回このURLを叩く想定。このルート自体はcron機能を
 * 持たず、「叩かれたら日次探索を1回実行する」役割のみを持つ。
 *
 * 認証: `CRON_API_TOKEN` 環境変数が未設定の場合は誤って外部公開しないよう常に無効化する
 * （/api/properties/ingest と同じ安全側デフォルトの方針）。設定されている場合、
 * リクエストヘッダー `x-cron-token` の値と一致しなければ拒否する。
 *
 * GET/POSTのどちらでも同じ処理を行う（スケジューラの実装によりどちらを使うか異なるため）。
 * Vercel Cron はGETでAuthorizationヘッダーを付けて呼ぶため、その場合はスケジューラ設定側で
 * `x-cron-token` ヘッダーを付与できるか確認すること（できない場合は別途対応が必要）。
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

  try {
    const summary = await runDailySearch();
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    // runDailySearch() 自体はソース単位でエラーを吸収する設計だが、
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
