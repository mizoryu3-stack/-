import type { RawListingInput } from "@/lib/ingestion/types";

/**
 * LIFULL HOME'S API 用の【未接続】データ取得アダプタのスタブ。
 *
 * ⚠️ 現時点では実装・接続されていない。LIFULL社との正式な「APIの使用許諾契約」が
 * 締結されるまでは、このファイルを呼び出す箇所（prisma/seed.ts 等）は存在しない。
 * 実際にHOME'SのWebサイトをスクレイピングする処理もここには一切含まれない。
 *
 * 正式契約後にやること（未実装）:
 *  1. LIFULL側のAPI仕様書（NDA配下のため現時点では入手できていない）に沿って
 *     `HomesApiListing` の型を実際のレスポンス形式に合わせて定義し直す
 *  2. `homesListingToRawListing()` で実際のフィールドを RawListingInput にマッピングする
 *  3. 契約条件（商用利用可否・取得件数上限・帰属表示義務など）を
 *     src/lib/ingestion/README.md に追記する
 *
 * @see src/lib/ingestion/README.md
 */

/** LIFULL HOME'S APIの実際のレスポンス形式（契約後に要更新。現時点ではプレースホルダー） */
export interface HomesApiListing {
  // 実APIの正式なフィールド名が判明し次第、ここを更新する
  [key: string]: unknown;
}

export function homesListingToRawListing(listing: HomesApiListing): RawListingInput {
  void listing;
  throw new Error(
    "LIFULL HOME'S APIとの正式契約が未完了のため未実装です。src/lib/ingestion/sources/homes.ts を参照してください。",
  );
}

/**
 * 正式契約後に実装する取得関数のインターフェースのみ用意している（未実装）。
 * 呼び出すとエラーになるため、現時点ではどこからも呼び出していない。
 */
export async function fetchHomesListings(): Promise<RawListingInput[]> {
  throw new Error(
    "LIFULL HOME'S APIとの正式契約が未完了のため未実装です。src/lib/ingestion/sources/homes.ts を参照してください。",
  );
}
