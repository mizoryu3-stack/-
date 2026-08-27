import { NextRequest, NextResponse } from "next/server";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { validateRawListing, type RawListingInput } from "@/lib/ingestion/types";

/**
 * 外部物件データを取り込むためのAPIエンドポイント（データ取得レイヤーの入り口）。
 *
 * 現時点ではこのAPIを叩く実際のデータ取得バッチ（SUUMO等のスクレイピング）は
 * 実装していない。将来、社内バッチや別サービスから正規化済みデータ(RawListingInput)を
 * POSTしてもらう想定で用意してある受け口。
 *
 * `INGEST_API_TOKEN` 環境変数が未設定の場合は誤って外部公開しないよう常に無効化する。
 *
 * リクエスト例:
 *   POST /api/properties/ingest
 *   Headers: x-ingest-token: <INGEST_API_TOKENの値>
 *   Body: { "listings": RawListingInput[] }
 */
export async function POST(req: NextRequest) {
  const token = process.env.INGEST_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "この機能は現在無効です（INGEST_API_TOKEN未設定）。" },
      { status: 501 },
    );
  }

  if (req.headers.get("x-ingest-token") !== token) {
    return NextResponse.json({ error: "認証に失敗しました。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSONの解析に失敗しました。" }, { status: 400 });
  }

  const listings = (body as { listings?: unknown[] })?.listings;
  if (!Array.isArray(listings) || listings.length === 0) {
    return NextResponse.json({ error: "listings（配列）が必要です。" }, { status: 400 });
  }

  const results: { index: number; propertyId?: number; errors?: string[] }[] = [];

  for (const [index, raw] of listings.entries()) {
    const validationErrors = validateRawListing(raw);
    if (validationErrors.length > 0) {
      results.push({ index, errors: validationErrors.map((e) => `${e.field}: ${e.message}`) });
      continue;
    }
    try {
      const propertyId = await ingestProperty(raw as RawListingInput);
      results.push({ index, propertyId });
    } catch (e) {
      results.push({ index, errors: [e instanceof Error ? e.message : "取込に失敗しました。"] });
    }
  }

  const failedCount = results.filter((r) => r.errors).length;
  return NextResponse.json(
    { total: listings.length, succeeded: listings.length - failedCount, failed: failedCount, results },
    { status: failedCount === listings.length ? 400 : 200 },
  );
}
