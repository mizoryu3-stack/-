"use server";

import { revalidatePath } from "next/cache";
import { updateDailySearchSchedule } from "@/lib/schedule/dailySearchSchedule";

export interface DailySearchScheduleFormState {
  errors: string[];
  success: boolean;
}

/**
 * /settings からの自動探索スケジュール更新（STEP9）。
 * SavedSearchのフォームと異なり単一の設定を更新するだけの画面のため、成功時もリダイレクトせず
 * 同じページに留まって結果（保存しました／エラー内容）を表示する。
 */
export async function updateDailySearchScheduleAction(
  _prevState: DailySearchScheduleFormState,
  formData: FormData,
): Promise<DailySearchScheduleFormState> {
  const enabled = formData.get("enabled") === "on";
  const time = String(formData.get("time") ?? "").trim();

  try {
    await updateDailySearchSchedule({ enabled, time });
  } catch (e) {
    return { errors: [e instanceof Error ? e.message : "保存に失敗しました"], success: false };
  }

  revalidatePath("/settings");
  return { errors: [], success: true };
}
