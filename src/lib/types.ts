// 筋トレ記録アプリのデータ型定義

/** 1セット分の記録 */
export interface SetEntry {
  id: string;
  /** 種目名 (例: ベンチプレス) */
  exerciseName: string;
  /** 重量 (kg) */
  weightKg: number;
  /** 回数 */
  reps: number;
}

/** 1回のトレーニング記録 (セッション) */
export interface WorkoutSession {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** トレーニング時間 (分) */
  durationMinutes?: number;
  /** 記録時点の体重 (kg) */
  bodyWeightKg?: number;
  /** 自由メモ */
  memo?: string;
  sets: SetEntry[];
  createdAt: string;
  updatedAt: string;
}

export type NewSetInput = Omit<SetEntry, "id">;
