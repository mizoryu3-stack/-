/**
 * 民泊適性スコア（仮ロジック）
 *
 * 現時点では「家賃・専有面積・駅からの距離・駐車場の有無・建物種別・築年数」
 * のみを使った簡易な加重平均で 0〜100 点を算出する。
 *
 * 将来的には以下の要素を追加してスコアリングを高度化する想定（未実装）:
 *  - 周辺観光地の充実度
 *  - 周辺の宿泊需要（検索ボリューム・イベント等）
 *  - 民泊関連の法規制（住宅宿泊事業法180日制限、自治体条例など）
 *  - マンションの管理規約（民泊可否）
 *  - 周辺の競合民泊の数・稼働率
 *  - 想定宿泊料金・想定稼働率（収益シミュレーションとの連動）
 *
 * この関数だけを差し替えれば、UI・API側の変更なしにスコアリングを
 * 高度化できるように意図的に分離してある。
 */

export type BuildingTypeForScore = "HOUSE" | "APARTMENT";

export interface ScoreInput {
  rent: number; // 家賃（円/月）
  areaSqm: number; // 専有面積（m2）
  stationWalkMin: number; // 駅徒歩（分）
  hasParking: boolean;
  buildingType: BuildingTypeForScore;
  builtYear: number; // 築年（西暦）
}

export interface ScoreBreakdownItem {
  label: string;
  score: number; // 0-100（各要素の評価点）
  weight: number; // 0-1（重み）
}

export interface ScoreResult {
  total: number; // 0-100（最終スコア、四捨五入）
  breakdown: ScoreBreakdownItem[];
}

// 0-100 の範囲にクランプ
function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// 線形にスコア化するヘルパー。value が良い方向に増えるほど高得点にしたい場合は invert=false、
// 減るほど高得点にしたい場合は invert=true。
function linearScore(
  value: number,
  goodAt: number,
  badAt: number,
): number {
  if (goodAt === badAt) return 100;
  const ratio = (value - badAt) / (goodAt - badAt);
  return clamp(ratio * 100);
}

export function calculateMinpakuScore(input: ScoreInput): ScoreResult {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - input.builtYear);

  // 家賃: 安いほど利益率が確保しやすいため高評価（5万円で満点、20万円で0点）
  const rentScore = linearScore(input.rent, 50_000, 200_000);

  // 専有面積: 広いほど宿泊人数・宿泊単価を上げやすいため高評価（15m2で0点、80m2で満点）
  const areaScore = linearScore(input.areaSqm, 80, 15);

  // 駅徒歩: 近いほど集客しやすいため高評価（0分で満点、20分で0点）
  const stationScore = linearScore(input.stationWalkMin, 0, 20);

  // 駐車場: 車での来訪需要（地方エリア等）に対応できるため加点
  const parkingScore = input.hasParking ? 100 : 40;

  // 建物種別: マンションは管理規約で民泊不可のケースがあるため、
  // 情報が無い現時点では戸建てをやや優遇（暫定値）
  const buildingTypeScore = input.buildingType === "HOUSE" ? 100 : 50;

  // 築年数: 新しいほど設備が整っており高評価（築5年以内で満点、築40年以上で20点）
  const ageScore = clamp(100 - age * 2, 20, 100);

  const breakdown: ScoreBreakdownItem[] = [
    { label: "家賃", score: rentScore, weight: 0.25 },
    { label: "専有面積", score: areaScore, weight: 0.2 },
    { label: "駅からの距離", score: stationScore, weight: 0.25 },
    { label: "駐車場", score: parkingScore, weight: 0.1 },
    { label: "建物種別", score: buildingTypeScore, weight: 0.1 },
    { label: "築年数", score: ageScore, weight: 0.1 },
  ];

  const total = Math.round(
    breakdown.reduce((sum, item) => sum + item.score * item.weight, 0),
  );

  return { total: clamp(total), breakdown };
}
