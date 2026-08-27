/**
 * 民泊適性スコア（仮ロジック）
 *
 * 「家賃・専有面積・駅からの距離・駐車場の有無・建物種別・築年数・周辺観光地・
 * 周辺競合民泊・地域の民泊規制レベル」から 0〜100 点の参考スコアを算出する。
 *
 * ⚠️ このスコアはあくまで参考値であり、住宅宿泊事業法の180日制限・旅館業許可の可否・
 * マンション管理規約・自治体条例などの法的な民泊可否を確定するものではない。
 * 詳しくは src/lib/regions.ts の MINPAKU_SCORE_DISCLAIMER を参照。
 *
 * 将来的にはさらに以下の要素を追加してスコアリングを高度化する想定（未実装）:
 *  - 周辺の宿泊需要（検索ボリューム・イベント等）
 *  - 想定宿泊料金・想定稼働率（収益シミュレーションとの連動）
 *  - AIによる物件評価
 *
 * この関数だけを差し替えれば、UI・API側の変更なしにスコアリングを
 * 高度化できるように意図的に分離してある。
 */

import type { RegulationLevel } from "@/lib/regions";

export type BuildingTypeForScore = "HOUSE" | "APARTMENT";

export interface ScoreInput {
  rent: number; // 家賃（円/月）
  areaSqm: number; // 専有面積（m2）
  stationWalkMin: number; // 駅徒歩（分）
  hasParking: boolean;
  buildingType: BuildingTypeForScore;
  builtYear: number; // 築年（西暦）
  /** 周辺観光地までの最短距離（km）。データが無い場合は null */
  nearestAttractionKm: number | null;
  /** 半径5km以内の観光地の件数 */
  nearbyAttractionCount: number;
  /** 半径2km以内の競合民泊の件数 */
  competitorCount: number;
  /** 物件所在地の民泊規制レベル（src/lib/regions.ts 参照） */
  regulationLevel: RegulationLevel;
}

export interface ScoreBreakdownItem {
  label: string;
  score: number; // 0-100（各要素の評価点）
  weight: number; // 0-1（重み）
  /** ユーザー向けの評価理由（一目で分かる短文） */
  reason: string;
}

export interface ScoreResult {
  total: number; // 0-100（最終スコア、四捨五入）
  breakdown: ScoreBreakdownItem[];
}

// 0-100 の範囲にクランプ
function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// 線形にスコア化するヘルパー。value が badAt→goodAt の向きで増えるほど高得点になる。
function linearScore(value: number, goodAt: number, badAt: number): number {
  if (goodAt === badAt) return 100;
  const ratio = (value - badAt) / (goodAt - badAt);
  return clamp(ratio * 100);
}

function tier(score: number, positive: string, neutral: string, negative: string): string {
  if (score >= 70) return positive;
  if (score >= 40) return neutral;
  return negative;
}

export function calculateMinpakuScore(input: ScoreInput): ScoreResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - input.builtYear);

  // 家賃: 安いほど利益率が確保しやすいため高評価（5万円で満点、20万円で0点）
  const rentScore = linearScore(input.rent, 50_000, 200_000);
  const rentReason = tier(
    rentScore,
    `家賃${Math.round(input.rent / 1000)}千円は低めで利益を確保しやすい水準です。`,
    `家賃${Math.round(input.rent / 1000)}千円は平均的な水準です。`,
    `家賃${Math.round(input.rent / 1000)}千円はやや高めで利益を圧迫する可能性があります。`,
  );

  // 専有面積: 広いほど宿泊人数・宿泊単価を上げやすいため高評価（15m2で0点、80m2で満点）
  const areaScore = linearScore(input.areaSqm, 80, 15);
  const areaReason = tier(
    areaScore,
    `専有面積${input.areaSqm}m²は広く、多人数向けの高単価設定がしやすいです。`,
    `専有面積${input.areaSqm}m²は標準的な広さです。`,
    `専有面積${input.areaSqm}m²はやや手狭で、宿泊人数・単価に制約が出る可能性があります。`,
  );

  // 駅徒歩: 近いほど集客しやすいため高評価（0分で満点、20分で0点）
  const stationScore = linearScore(input.stationWalkMin, 0, 20);
  const stationReason = tier(
    stationScore,
    `駅徒歩${input.stationWalkMin}分と好立地で集客しやすいです。`,
    `駅徒歩${input.stationWalkMin}分は許容範囲内です。`,
    `駅徒歩${input.stationWalkMin}分とやや遠く、集客面で不利な可能性があります。`,
  );

  // 駐車場: 車での来訪需要（地方エリア等）に対応できるため加点
  const parkingScore = input.hasParking ? 100 : 40;
  const parkingReason = input.hasParking
    ? "駐車場ありのため、車での来訪需要にも対応できます。"
    : "駐車場なしのため、車での来訪が多いエリアではやや不利です。";

  // 建物種別: マンションは管理規約で民泊不可のケースがあるため、
  // 情報が無い現時点では戸建てをやや優遇（暫定値）
  const buildingTypeScore = input.buildingType === "HOUSE" ? 100 : 50;
  const buildingTypeReason =
    input.buildingType === "HOUSE"
      ? "戸建てのため管理規約による民泊制限を受けにくい傾向があります。"
      : "マンションのため、管理規約で民泊が制限されていないか要確認です。";

  // 築年数: 新しいほど設備が整っており高評価（築5年以内で満点、築40年以上で20点）
  const ageScore = clamp(100 - age * 2, 20, 100);
  const ageReason = tier(
    ageScore,
    `築${age}年と新しく、設備面でのアピールがしやすいです。`,
    `築${age}年は標準的で、内装次第で十分アピールできます。`,
    `築${age}年とやや古く、リフォーム等の初期投資が必要になる可能性があります。`,
  );

  // 周辺観光地: 近いほど・多いほど高評価
  const proximityScore =
    input.nearestAttractionKm === null ? 0 : linearScore(input.nearestAttractionKm, 0, 8);
  const countScore = clamp((Math.min(input.nearbyAttractionCount, 5) / 5) * 100);
  const attractionScore = clamp(proximityScore * 0.7 + countScore * 0.3);
  const attractionReason =
    input.nearestAttractionKm === null
      ? "周辺観光地の情報が未登録です。"
      : tier(
          attractionScore,
          `最寄りの観光地まで約${input.nearestAttractionKm}kmと近く、周辺に観光地が${input.nearbyAttractionCount}件あります。`,
          `最寄りの観光地まで約${input.nearestAttractionKm}kmです。`,
          `周辺観光地まで距離があり、観光需要は限定的な可能性があります。`,
        );

  // 競合: 少ないほど高評価（0件で満点、10件以上で0点）
  const competitionScore = linearScore(input.competitorCount, 0, 10);
  const competitionReason = tier(
    competitionScore,
    `周辺の競合民泊は${input.competitorCount}件と少なく、稼働を確保しやすい可能性があります。`,
    `周辺の競合民泊は${input.competitorCount}件です。`,
    `周辺の競合民泊が${input.competitorCount}件と多く、価格競争になりやすい可能性があります。`,
  );

  // 地域の民泊規制レベル: 厳しいほど減点（あくまで仮の目安）
  const regulationScoreMap: Record<RegulationLevel, number> = { LOW: 100, MEDIUM: 60, HIGH: 20 };
  const regulationScore = regulationScoreMap[input.regulationLevel];
  const regulationReason =
    input.regulationLevel === "LOW"
      ? "このエリアの民泊関連規制は比較的緩やかな目安です（要自治体確認）。"
      : input.regulationLevel === "MEDIUM"
        ? "このエリアは民泊関連の手続き・ルールがやや細かい目安です（要自治体確認）。"
        : "このエリアは民泊関連規制が厳しい目安です（要自治体確認）。";

  const breakdown: ScoreBreakdownItem[] = [
    { label: "家賃", score: rentScore, weight: 0.2, reason: rentReason },
    { label: "専有面積", score: areaScore, weight: 0.15, reason: areaReason },
    { label: "駅からの距離", score: stationScore, weight: 0.15, reason: stationReason },
    { label: "周辺観光地", score: attractionScore, weight: 0.15, reason: attractionReason },
    { label: "周辺競合", score: competitionScore, weight: 0.1, reason: competitionReason },
    { label: "民泊規制（目安）", score: regulationScore, weight: 0.1, reason: regulationReason },
    { label: "駐車場", score: parkingScore, weight: 0.05, reason: parkingReason },
    { label: "建物種別", score: buildingTypeScore, weight: 0.05, reason: buildingTypeReason },
    { label: "築年数", score: ageScore, weight: 0.05, reason: ageReason },
  ];

  const total = Math.round(
    breakdown.reduce((sum, item) => sum + item.score * item.weight, 0),
  );

  return { total: clamp(total), breakdown };
}
