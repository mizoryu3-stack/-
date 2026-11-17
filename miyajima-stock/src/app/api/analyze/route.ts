import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { ExtractionSchema } from "@/lib/ai-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// 目安料金（USD / 100万トークン）。表示用の概算にのみ使用
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
const MAX_IMAGE_BASE64 = 5 * 1024 * 1024; // Claude の画像上限（base64）

const RequestSchema = z.object({
  image: z.object({
    media_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    data: z.string().min(1).max(MAX_IMAGE_BASE64),
  }),
  categories: z.array(z.string().max(40)).max(100).default([]),
});

const SYSTEM = `あなたは日本の民泊施設の備品管理アシスタントです。
ユーザーがアップロードした通販サイト（Amazon・楽天市場・ニトリ・Yahoo!ショッピング・IKEA・無印良品・その他）のスクリーンショットから、商品情報を正確に抽出します。

厳守するルール:
- 画像に書かれていない情報は推測せず null にする。特に価格・URL・型番は推測しない。
- 価格は日本円の整数。「¥12,800」「12,800円（税込）」→ 12800。
- 割引前価格（参考価格・通常価格・取り消し線の価格）と販売価格が両方ある場合、price には現在の販売価格を入れ、list_price に割引前価格を入れる。
- ポイント還元額やクーポン適用後の推定額は price にしない。
- 送料は price に含めず shipping_fee に分ける。「送料無料」は 0。
- short_name は管理しやすい簡潔な日本語名にする（例:「天然木製センターテーブル ナチュラル 幅90cm リビング用」→「木製ローテーブル」）。original_name には表示された商品名をそのまま入れる。
- 1枚に複数の商品が写っている場合（検索結果・カート・注文履歴など）は商品ごとに分ける。広告・おすすめ枠の商品は、ユーザーが対象としている可能性が低ければ含めない。
- suggested_categories は与えられた候補リストの名前だけを使う。
- 商品が見当たらない画像なら is_product_page を false、products を空配列にする。`;

export async function POST(req: Request) {
  // 認証必須（ログインユーザーのみ利用可能）
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI解析が設定されていません（サーバーに ANTHROPIC_API_KEY が未設定です）。手入力で登録できます。" },
      { status: 503 },
    );
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "画像データが不正です（サイズが大きすぎる可能性があります）" }, { status: 400 });
  }

  // 自動再試行は行わない（利用料金の発生を防ぐため）
  const client = new Anthropic({ maxRetries: 0, timeout: 55_000 });

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(ExtractionSchema),
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.image.media_type, data: body.image.data } },
            {
              type: "text",
              text: `カテゴリー候補: ${body.categories.length ? body.categories.join("、") : "（なし）"}\nこのスクリーンショットから商品情報を抽出してください。`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "この画像は解析できませんでした。手入力で登録してください。" }, { status: 422 });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return NextResponse.json({ error: "解析結果を読み取れませんでした。手入力で登録してください。" }, { status: 422 });
    }

    const result = response.parsed_output;
    result.products = result.products.slice(0, 10);
    const price = PRICING[response.model] ?? PRICING[MODEL];
    const costUsd = price
      ? (response.usage.input_tokens * price.input + response.usage.output_tokens * price.output) / 1_000_000
      : null;
    return NextResponse.json({
      result,
      model: response.model,
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, cost_usd: costUsd },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AIの利用が混み合っています。少し時間をおいて再度お試しください。" }, { status: 429 });
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json({ error: "AIのAPIキーが無効です。管理者に設定を確認してください。" }, { status: 502 });
    }
    if (e instanceof Anthropic.BadRequestError) {
      console.error("[analyze] bad request", e.message);
      return NextResponse.json({ error: "この画像は解析できませんでした（形式またはサイズ）。手入力で登録してください。" }, { status: 400 });
    }
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      return NextResponse.json({ error: "AI解析がタイムアウトしました。もう一度お試しください。" }, { status: 504 });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("[analyze] api error", e.status, e.message);
      return NextResponse.json({ error: "AI解析でエラーが発生しました。もう一度お試しください。" }, { status: 502 });
    }
    console.error("[analyze] unexpected", e);
    return NextResponse.json({ error: "AI解析でエラーが発生しました。" }, { status: 500 });
  }
}
