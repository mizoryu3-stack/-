import type { RawListingInput } from "@/lib/ingestion/types";

/**
 * 広島県「ひろしま空き家バンク みんと。」および各市（廿日市市・広島市・呉市・東広島市）
 * 空き家バンク向けの【未接続】データ取得アダプタのスタブ。
 *
 * ⚠️ 現時点では実装・接続されていない。「みんと。」の利用規約 第6条は
 * 「いかなる二次利用も禁止します」と明記しており、無断でのデータ取得・転載は行わない。
 * 実際にサイトをスクレイピングする処理もここには一切含まれない。
 *
 * 想定している正式な連携方法（未実装。広島県・各市への問い合わせが前提）:
 *  1. 広島県土木建築局住宅課、または各市住宅政策課にデータ提供・API連携を相談する
 *     （国のProject LINKS、他自治体でのAPI連携実績あり）
 *  2. 許諾が得られた場合、提供形式（API / CSV等の定期エクスポート）に応じて
 *     `fetchAkiyabankListings()` を実装する
 *
 * ⚠️ 空き家バンクは賃貸だけでなく売買物件も混在する。現在のRawListingInput/Propertyは
 * 賃貸(rent)を前提としたスキーマのため、売買物件を扱う場合は dealType のような
 * 区分の追加を別途検討する必要がある（今回はスキーマ変更していない）。
 *
 * @see src/lib/ingestion/README.md
 */

export interface AkiyabankListing {
  // 提供形式が確定していないため、実データが得られ次第このスタブを更新する
  [key: string]: unknown;
}

export function akiyabankListingToRawListing(listing: AkiyabankListing): RawListingInput {
  void listing;
  throw new Error(
    "空き家バンクとの正式なデータ連携が未確立のため未実装です。src/lib/ingestion/sources/akiyabank.ts を参照してください。",
  );
}

/**
 * 正式なデータ提供を受けられた場合に実装する取得関数のインターフェースのみ用意している
 * （未実装）。呼び出すとエラーになるため、現時点ではどこからも呼び出していない。
 */
export async function fetchAkiyabankListings(): Promise<RawListingInput[]> {
  throw new Error(
    "空き家バンクとの正式なデータ連携が未確立のため未実装です。src/lib/ingestion/sources/akiyabank.ts を参照してください。",
  );
}
