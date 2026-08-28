import type { BodyFocus, WorkoutSession } from "./types";
import { BODY_FOCUS_LABEL } from "./types";

/** 種目名からおおまかな部位を推定するための簡易辞書。 */
const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  {
    category: "胸",
    keywords: [
      "ベンチプレス",
      "チェストプレス",
      "プッシュアップ",
      "腕立て",
      "ダンベルプレス",
      "フライ",
      "ディップス",
    ],
  },
  {
    category: "背中",
    keywords: [
      "デッドリフト",
      "懸垂",
      "チンニング",
      "ラットプル",
      "ローイング",
      "ロウ",
      "バックエクステンション",
    ],
  },
  {
    category: "脚",
    keywords: [
      "スクワット",
      "レッグプレス",
      "レッグカール",
      "レッグエクステンション",
      "ランジ",
      "カーフレイズ",
      "ヒップスラスト",
    ],
  },
  {
    category: "肩",
    keywords: [
      "ショルダープレス",
      "サイドレイズ",
      "リアレイズ",
      "アップライトロウ",
      "オーバーヘッドプレス",
    ],
  },
  {
    category: "腕",
    keywords: ["アームカール", "カール", "トライセプス", "キックバック", "プッシュダウン"],
  },
  {
    category: "体幹",
    keywords: ["プランク", "クランチ", "シットアップ", "アブローラー", "レッグレイズ"],
  },
];

export function categorizeExercise(exerciseName: string): string {
  const found = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((k) => exerciseName.includes(k)),
  );
  return found?.category ?? "その他";
}

/** 上半身・下半身の判定に使う部位カテゴリの分類。「体幹」「その他」はどちらにも属さない中立扱い。 */
const UPPER_CATEGORIES = ["胸", "背中", "肩", "腕"];
const LOWER_CATEGORIES = ["脚"];

export interface ExerciseAggregate {
  exerciseName: string;
  volume: number;
  topWeightKg: number;
  topWeightReps: number;
  setCount: number;
}

/** セッション内を種目ごとに集計する。 */
export function aggregateByExercise(
  session: WorkoutSession,
): ExerciseAggregate[] {
  const map = new Map<string, ExerciseAggregate>();
  for (const set of session.sets) {
    const current = map.get(set.exerciseName) ?? {
      exerciseName: set.exerciseName,
      volume: 0,
      topWeightKg: 0,
      topWeightReps: 0,
      setCount: 0,
    };
    current.volume += set.weightKg * set.reps * set.setCount;
    current.setCount += set.setCount;
    if (
      set.weightKg > current.topWeightKg ||
      (set.weightKg === current.topWeightKg && set.reps > current.topWeightReps)
    ) {
      current.topWeightKg = set.weightKg;
      current.topWeightReps = set.reps;
    }
    map.set(set.exerciseName, current);
  }
  return [...map.values()];
}

export function sessionVolume(session: WorkoutSession): number {
  return session.sets.reduce((sum, s) => sum + s.weightKg * s.reps * s.setCount, 0);
}

/** セッション全体の実施セット数 (各行のsetCountの合計)。 */
export function totalSetCount(session: WorkoutSession): number {
  return session.sets.reduce((sum, s) => sum + s.setCount, 0);
}

function averageReps(session: WorkoutSession): number {
  const sets = totalSetCount(session);
  if (sets === 0) return 0;
  return session.sets.reduce((sum, s) => sum + s.reps * s.setCount, 0) / sets;
}

/** 直近7日以内など、指定日より前のセッションを新しい順に返す。 */
function sessionsBefore(
  sessions: WorkoutSession[],
  date: string,
  excludeId: string,
): WorkoutSession[] {
  return sessions
    .filter((s) => s.id !== excludeId && s.date < date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface CalorieEstimate {
  kcal: number;
  met: number;
  usedDurationMinutes: number;
  usedBodyWeightKg: number;
  assumptions: string[];
}

/** METs法によるおおまかな消費カロリー概算。 */
export function estimateCalories(session: WorkoutSession): CalorieEstimate {
  const assumptions: string[] = [];

  const avgReps = averageReps(session);
  let met: number;
  if (avgReps <= 8) {
    met = 6.0; // 高重量・低回数 (強度高め)
  } else if (avgReps <= 15) {
    met = 5.0; // 中重量・中回数
  } else {
    met = 4.0; // 低重量・高回数
  }

  let durationMinutes = session.durationMinutes;
  if (!durationMinutes || durationMinutes <= 0) {
    durationMinutes = Math.max(totalSetCount(session), 1) * 3;
    assumptions.push(
      `トレーニング時間が未入力のため、1セットあたり3分として概算 (${durationMinutes}分)`,
    );
  }

  let bodyWeightKg = session.bodyWeightKg;
  if (!bodyWeightKg || bodyWeightKg <= 0) {
    bodyWeightKg = 65;
    assumptions.push("体重が未入力のため、65kgとして概算");
  }

  const kcal = (met * 3.5 * bodyWeightKg) / 200 * durationMinutes;

  return {
    kcal: Math.round(kcal),
    met,
    usedDurationMinutes: durationMinutes,
    usedBodyWeightKg: bodyWeightKg,
    assumptions,
  };
}

export interface ExerciseComparison {
  exerciseName: string;
  volume: number;
  previousVolume: number | null;
  volumeChangePct: number | null;
  topWeightKg: number;
  previousTopWeightKg: number | null;
  setCount: number;
  isStagnant: boolean;
}

export interface SessionReview {
  summary: string;
  totalVolume: number;
  previousTotalVolume: number | null;
  totalVolumeChangePct: number | null;
  calorie: CalorieEstimate;
  comparisons: ExerciseComparison[];
  categoriesTrained: string[];
  suggestions: string[];
  focusEvaluation: string | null;
}

/** 選択された「トレーニング種別 (上半身/下半身/全身)」に沿った内容だったかを毎回自動評価する。 */
export function evaluateBodyFocus(
  bodyFocus: BodyFocus | undefined,
  categoriesTrained: string[],
): string | null {
  if (!bodyFocus) return null;

  const upperCats = categoriesTrained.filter((c) => UPPER_CATEGORIES.includes(c));
  const lowerCats = categoriesTrained.filter((c) => LOWER_CATEGORIES.includes(c));
  const label = BODY_FOCUS_LABEL[bodyFocus];

  if (bodyFocus === "upper") {
    if (lowerCats.length > 0) {
      return `「${label}」の日として記録されていますが、${lowerCats.join(
        "・",
      )}の種目も含まれています。上半身に絞るか、種別を「全身」に変更しても良いかもしれません。`;
    }
    if (upperCats.length === 0) {
      return `「${label}」の日として記録されていますが、上半身の種目が見当たりません。種目名を確認してみましょう。`;
    }
    if (upperCats.length === 1) {
      const missing = UPPER_CATEGORIES.filter((c) => c !== upperCats[0]);
      return `${upperCats[0]}中心の上半身デーでした。次回は${missing.join(
        "・",
      )}なども加えるとバランスが良くなります。`;
    }
    return `${upperCats.join("・")}と、上半身をバランスよく鍛えられた1日でした。`;
  }

  if (bodyFocus === "lower") {
    if (upperCats.length > 0) {
      return `「${label}」の日として記録されていますが、${upperCats.join(
        "・",
      )}の種目も含まれています。下半身に絞るか、種別を「全身」に変更しても良いかもしれません。`;
    }
    if (lowerCats.length === 0) {
      return `「${label}」の日として記録されていますが、脚の種目が見当たりません。スクワットなど脚種目の名前を確認してみましょう。`;
    }
    return "しっかり下半身を追い込めた1日でした。";
  }

  // full (全身)
  if (upperCats.length > 0 && lowerCats.length > 0) {
    return "上半身・下半身ともに種目が入っており、全身をバランスよく鍛えられました。";
  }
  if (upperCats.length > 0 && lowerCats.length === 0) {
    return "「全身」の日として記録されていますが、上半身の種目に偏っています。次回は脚の種目も加えてみましょう。";
  }
  if (lowerCats.length > 0 && upperCats.length === 0) {
    return "「全身」の日として記録されていますが、下半身の種目に偏っています。次回は上半身の種目も加えてみましょう。";
  }
  return `「${label}」の日として記録されました。`;
}

/** 保存されたセッションと過去の記録から、総評・比較・改善提案を組み立てる。 */
export function buildSessionReview(
  session: WorkoutSession,
  allSessions: WorkoutSession[],
): SessionReview {
  const past = sessionsBefore(allSessions, session.date, session.id);
  const totalVolume = sessionVolume(session);
  const previousSession = past[0] ?? null;
  const previousTotalVolume = previousSession
    ? sessionVolume(previousSession)
    : null;
  const totalVolumeChangePct =
    previousTotalVolume && previousTotalVolume > 0
      ? ((totalVolume - previousTotalVolume) / previousTotalVolume) * 100
      : null;

  const currentAggregates = aggregateByExercise(session);
  const comparisons: ExerciseComparison[] = currentAggregates.map((agg) => {
    // この種目を含む直近の過去セッションを探す
    const prevSessionForExercise = past.find((s) =>
      s.sets.some((set) => set.exerciseName === agg.exerciseName),
    );
    const prevAgg = prevSessionForExercise
      ? aggregateByExercise(prevSessionForExercise).find(
          (a) => a.exerciseName === agg.exerciseName,
        ) ?? null
      : null;

    // 直近2回分、重量・回数ともに変化がなければ「停滞」とみなす
    const priorSessionsForExercise = past
      .filter((s) => s.sets.some((set) => set.exerciseName === agg.exerciseName))
      .slice(0, 2)
      .map(
        (s) =>
          aggregateByExercise(s).find(
            (a) => a.exerciseName === agg.exerciseName,
          ) ?? null,
      )
      .filter((a): a is ExerciseAggregate => a !== null);
    const isStagnant =
      priorSessionsForExercise.length >= 2 &&
      priorSessionsForExercise.every(
        (a) =>
          a.topWeightKg === agg.topWeightKg &&
          a.topWeightReps === agg.topWeightReps,
      );

    return {
      exerciseName: agg.exerciseName,
      volume: agg.volume,
      previousVolume: prevAgg ? prevAgg.volume : null,
      volumeChangePct:
        prevAgg && prevAgg.volume > 0
          ? ((agg.volume - prevAgg.volume) / prevAgg.volume) * 100
          : null,
      topWeightKg: agg.topWeightKg,
      previousTopWeightKg: prevAgg ? prevAgg.topWeightKg : null,
      setCount: agg.setCount,
      isStagnant,
    };
  });

  const categoriesTrained = [
    ...new Set(currentAggregates.map((a) => categorizeExercise(a.exerciseName))),
  ];

  // --- 総評の生成 ---
  let summary: string;
  if (previousSession === null) {
    summary =
      "これが最初の記録です。まずは記録を続けることが上達の第一歩、お疲れ様でした。";
  } else if (totalVolumeChangePct === null) {
    summary = `総ボリュームは${Math.round(totalVolume)}kgでした。`;
  } else if (totalVolumeChangePct >= 10) {
    summary = `前回より総ボリュームが${totalVolumeChangePct.toFixed(
      0,
    )}%アップ。かなり充実したトレーニングができています。`;
  } else if (totalVolumeChangePct >= 0) {
    summary = `前回とほぼ同等〜微増(${totalVolumeChangePct.toFixed(
      0,
    )}%)の総ボリュームで、安定して継続できています。`;
  } else if (totalVolumeChangePct >= -15) {
    summary = `前回より総ボリュームがやや少なめ(${totalVolumeChangePct.toFixed(
      0,
    )}%)でした。疲労が残っていたのかもしれません。`;
  } else {
    summary = `前回より総ボリュームが大きく減少(${totalVolumeChangePct.toFixed(
      0,
    )}%)しました。体調や睡眠・栄養を見直すタイミングかもしれません。`;
  }

  // --- 改善提案の生成 ---
  const suggestions: string[] = [];

  for (const c of comparisons) {
    if (c.isStagnant) {
      suggestions.push(
        `${c.exerciseName}は同じ重量・回数が続いています。次回は+2.5kg、または回数を1〜2回増やしてみましょう。`,
      );
    } else if (c.volumeChangePct !== null && c.volumeChangePct < -10) {
      suggestions.push(
        `${c.exerciseName}のボリュームが前回より低下しています。フォームや休息時間を見直してみましょう。`,
      );
    }
  }

  const highRepExercises = currentAggregates.filter(
    (a) => a.topWeightReps >= 20,
  );
  for (const a of highRepExercises) {
    suggestions.push(
      `${a.exerciseName}は回数が多め(${a.topWeightReps}回)です。筋力向上が目的なら、重量を上げて8〜12回で追い込むのも効果的です。`,
    );
  }

  const trainedRecently = new Set(
    allSessions
      .filter((s) => s.date >= addDays(session.date, -7) && s.date <= session.date)
      .flatMap((s) => aggregateByExercise(s).map((a) => categorizeExercise(a.exerciseName))),
  );
  const allCategories = ["胸", "背中", "脚", "肩", "腕", "体幹"];
  const untouched = allCategories.filter((c) => !trainedRecently.has(c));
  if (untouched.length > 0 && untouched.length < allCategories.length) {
    suggestions.push(
      `直近7日間で「${untouched.join(
        "・",
      )}」の部位が未実施です。バランスを考えるなら次回以降に取り入れてみましょう。`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "順調に記録が伸びています。この調子でフォームと休養を大切に続けましょう。",
    );
  }

  return {
    summary,
    totalVolume,
    previousTotalVolume,
    totalVolumeChangePct,
    calorie: estimateCalories(session),
    comparisons,
    categoriesTrained,
    suggestions,
    focusEvaluation: evaluateBodyFocus(session.bodyFocus, categoriesTrained),
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
