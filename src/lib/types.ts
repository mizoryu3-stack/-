// 筋トレ記録アプリのデータ型定義

/** 1種目・1つの重量×回数の組み合わせの記録 (同じ内容をセット数分行ったものとして扱う) */
export interface SetEntry {
  id: string;
  /** 種目名 (例: ベンチプレス) */
  exerciseName: string;
  /** 重量 (kg) */
  weightKg: number;
  /** 1セットあたりの回数 */
  reps: number;
  /** セット数 (同じ重量・回数を何セット行ったか) */
  setCount: number;
}

/** トレーニングの種別 (鍛えた部位の大分類) */
export type BodyFocus = "upper" | "lower" | "full";

export const BODY_FOCUS_LABEL: Record<BodyFocus, string> = {
  upper: "上半身",
  lower: "下半身",
  full: "全身",
};

/** 1回のトレーニング記録 (セッション) */
export interface WorkoutSession {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** トレーニング時間 (分) */
  durationMinutes?: number;
  /** 記録時点の体重 (kg) */
  bodyWeightKg?: number;
  /** トレーニング種別 (任意) */
  bodyFocus?: BodyFocus;
  /** 自由メモ */
  memo?: string;
  sets: SetEntry[];
  createdAt: string;
  updatedAt: string;
}

export type NewSetInput = Omit<SetEntry, "id">;
