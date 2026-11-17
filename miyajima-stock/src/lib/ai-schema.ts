import * as z from "zod/v4";

/** Claude に返してもらう商品情報（1枚の画像に複数商品があり得る） */
export const ExtractedProductSchema = z.object({
  short_name: z.string().describe("管理しやすい短い商品名（例: 木製ローテーブル）。20文字程度まで"),
  original_name: z.string().nullable().describe("画像に表示されている元の商品名（そのまま）"),
  item_type: z.string().nullable().describe("商品の種類（例: テーブル, 掃除機, タオル）"),
  price: z.number().int().nullable().describe("現在の販売価格（税込、円の整数）。割引前価格ではなく実際に支払う価格。読み取れなければ null"),
  list_price: z.number().int().nullable().describe("割引前・参考価格（表示されていれば）。なければ null"),
  shipping_fee: z.number().int().nullable().describe("送料（円の整数）。送料無料なら 0、表示がなければ null"),
  brand: z.string().nullable().describe("メーカー・ブランド"),
  store: z.string().nullable().describe("販売サイト（Amazon, 楽天市場, ニトリ, Yahoo!ショッピング, IKEA, 無印良品 など）。判別できなければ null"),
  model_number: z.string().nullable().describe("型番・品番"),
  color: z.string().nullable().describe("色"),
  size: z.string().nullable().describe("サイズ・寸法（例: 幅90×奥行45×高さ35cm）"),
  description: z.string().nullable().describe("商品説明の要約（100文字程度まで）"),
  url: z.string().nullable().describe("画像内に明確に読み取れる商品URLのみ。推測で作らない。なければ null"),
  quantity: z.number().int().nullable().describe("画像内で指定されている購入数量（カート画面など）。なければ null"),
  suggested_categories: z
    .array(z.string())
    .describe("候補カテゴリー名から当てはまるものを0〜2個（必ず候補リストの名前をそのまま使う）"),
  image_box: z
    .array(z.number().int())
    .nullable()
    .describe("商品写真が写っている領域 [左, 上, 右, 下]。画像全体を 0〜1000 に正規化した整数座標。商品写真がなければ null"),
  confidence: z.enum(["high", "medium", "low"]).describe("読み取りの確からしさ"),
});

export const ExtractionSchema = z.object({
  is_product_page: z.boolean().describe("商品ページ・商品一覧・カート・注文履歴などのスクリーンショットか"),
  products: z.array(ExtractedProductSchema).describe("画像内の商品。複数あれば商品ごとに分ける。最大10件"),
  notes: z.string().nullable().describe("読み取れなかった項目など、ユーザーへの補足（日本語・短く）"),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;
