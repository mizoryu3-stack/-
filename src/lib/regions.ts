/**
 * アプリが対応するエリアの設定。
 *
 * 現時点では広島県内の4市のみに対応する（STEP6）。全国対応する場合は
 * この配列に都道府県・市区町村を追加するだけでよく、検索画面のセレクトや
 * スコアリング（民泊規制レベル）はすべてこの設定を参照する構造にしてある。
 *
 * ⚠️ regulationLevel / regulationNote は民泊適性スコアのデモ用に用意した
 * 「仮の目安」であり、実際の条例・自治体ルールを調査して反映したものではない。
 * 住宅宿泊事業法・旅館業法・自治体条例の内容は変更されることがあるため、
 * 実際に民泊を始める際は必ず自治体・保健所等で最新情報を確認すること。
 */

export type RegulationLevel = "LOW" | "MEDIUM" | "HIGH";

export interface SupportedArea {
  prefecture: string;
  city: string;
  /** 民泊関連規制の厳しさの仮の目安（スコアリングのデモ用。未検証） */
  regulationLevel: RegulationLevel;
  /** UIに表示する注意書き（法的な確定情報ではないことを明示する） */
  regulationNote: string;
}

export const SUPPORTED_PREFECTURE = "広島県";

// 広島市は8区に分かれており、Property.city には「広島市中区」のように区名まで含めて
// 保存している。SUPPORTED_AREASもそれに合わせて区単位で保持する
// （以前は「広島市」のみを掲載しており、検索フィルタが区名と一致せず機能していなかった）。
const HIROSHIMA_CITY_WARDS = [
  "広島市中区",
  "広島市東区",
  "広島市南区",
  "広島市西区",
  "広島市安佐南区",
  "広島市安佐北区",
  "広島市安芸区",
  "広島市佐伯区",
] as const;

const HIROSHIMA_CITY_REGULATION_NOTE =
  "政令指定都市のため住宅宿泊事業法の届出窓口・管理ルールが比較的細かい傾向があります（仮の目安・要確認）。";

export const SUPPORTED_AREAS: SupportedArea[] = [
  ...HIROSHIMA_CITY_WARDS.map(
    (city): SupportedArea => ({
      prefecture: "広島県",
      city,
      regulationLevel: "MEDIUM",
      regulationNote: HIROSHIMA_CITY_REGULATION_NOTE,
    }),
  ),
  {
    prefecture: "広島県",
    city: "廿日市市",
    regulationLevel: "LOW",
    regulationNote: "宮島など観光需要は高いエリアです（仮の目安・要確認）。",
  },
  {
    prefecture: "広島県",
    city: "呉市",
    regulationLevel: "LOW",
    regulationNote: "臨海部を中心に観光需要があるエリアです（仮の目安・要確認）。",
  },
  {
    prefecture: "広島県",
    city: "東広島市",
    regulationLevel: "LOW",
    regulationNote: "大学・企業関連の中長期滞在需要も見込めるエリアです（仮の目安・要確認）。",
  },
];

export function findSupportedArea(city: string): SupportedArea | undefined {
  return SUPPORTED_AREAS.find((a) => a.city === city);
}

export function getRegulationLevel(city: string): RegulationLevel {
  return findSupportedArea(city)?.regulationLevel ?? "MEDIUM";
}

/** 民泊適性スコア全体に添える免責文言 */
export const MINPAKU_SCORE_DISCLAIMER =
  "民泊適性スコアはプロトタイプの仮ロジックによる参考値です。住宅宿泊事業法の180日制限、旅館業許可の可否、マンション管理規約、自治体ごとの条例などの法的な民泊可否を判定・保証するものではありません。実際の運営前に必ず自治体・管理組合等にご確認ください。";

/** 「民泊利用について」欄（オーナー確認状況）に添える免責文言 */
export const MINPAKU_CONSULTATION_DISCLAIMER =
  "物件提供元（不動産会社等）から得た、民泊利用についての確認状況を示す参考情報です。「民泊が法的に可能」であることを保証・断定するものではありません。実際の運営には別途、自治体・管理組合等への確認が必要です。";

/**
 * 国土交通省「不動産情報ライブラリ」APIが要求する5桁の市区町村コード（全国地方公共団体コードの
 * 上5桁）。src/lib/publicData/ から、取引価格情報API(XIT001)を呼び出す際に使用する。
 *
 * 広島市中区・東区・南区は複数の公的資料で確認済み。それ以外の区は一般に公表されている
 * コード体系からの推定であり、実際にAPIを呼び出した際にコードが誤っていても
 * （該当データなし・エラー）として安全にフォールバックする設計になっているため、
 * 多少の誤りがあってもアプリの動作には影響しない。
 */
export const MUNICIPALITY_CODES: Partial<Record<string, string>> = {
  "広島市中区": "34101",
  "広島市東区": "34102",
  "広島市南区": "34103",
  "広島市西区": "34104",
  "広島市安佐南区": "34108",
  "広島市安佐北区": "34109",
  "広島市安芸区": "34106",
  "広島市佐伯区": "34107",
  "呉市": "34202",
  "東広島市": "34212",
  "廿日市市": "34213",
};

export function getMunicipalityCode(city: string): string | undefined {
  return MUNICIPALITY_CODES[city];
}

export const LAYOUT_OPTIONS = [
  "1R",
  "1K",
  "1DK",
  "1LDK",
  "2K",
  "2DK",
  "2LDK",
  "3DK",
  "3LDK",
  "4LDK",
] as const;
