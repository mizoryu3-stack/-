import type { Property } from "@/generated/prisma/client";
import type { RawListingInput } from "@/lib/ingestion/types";

/**
 * externalId が無いデータソースからの取込時に、既存物件と同一の可能性がある候補を探す
 * ための拡張ポイント。
 *
 * ⚠️ 現時点では常に null を返すダミー実装。実際のあいまい一致ロジック
 * （住所の正規化・部屋番号の抽出・物件名の類似度判定など）は未実装。
 *
 * 将来この関数の中身を実装すれば、ingestProperty() 側のコードは一切変更せずに
 * 「externalIdが無いソースの重複防止」を有効化できる。想定している実装方針:
 *  - 同一 city・同一 buildingType・家賃/面積が近い物件に候補を絞り込む
 *  - 住所文字列の正規化（全角/半角、丁目・番地の表記ゆれ吸収）＋部分一致
 *  - 物件名の類似度（レーベンシュタイン距離等）でスコアリング
 *  - 一定スコア以上を「重複候補」として返し、呼び出し側で自動マージはせず
 *    人がレビューする運用にする（誤マージのリスクを避けるため）
 */
export async function findDuplicateCandidate(raw: RawListingInput): Promise<Property | null> {
  void raw;
  return null;
}
