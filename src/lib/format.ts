export function formatYen(value: number): string {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

export function formatManYen(value: number): string {
  return `約${Math.round(value).toLocaleString("ja-JP")}円`;
}

export function calcAge(builtYear: number): number {
  return Math.max(0, new Date().getFullYear() - builtYear);
}

export const buildingTypeLabel: Record<"HOUSE" | "APARTMENT", string> = {
  HOUSE: "戸建て",
  APARTMENT: "マンション",
};

export const listingStatusLabel: Record<"ACTIVE" | "ENDED" | "UNKNOWN", string> = {
  ACTIVE: "掲載中",
  ENDED: "掲載終了",
  UNKNOWN: "確認できません",
};

// 民泊利用について物件提供元から得た確認状況の表示ラベル。listingStatusとは別概念。
export type MinpakuConsultationStatus =
  | "OWNER_CONFIRMED_AVAILABLE"
  | "OWNER_CONFIRM_REQUIRED"
  | "NOT_AVAILABLE"
  | "UNKNOWN";

export const minpakuConsultationStatusLabel: Record<MinpakuConsultationStatus, string> = {
  OWNER_CONFIRMED_AVAILABLE: "オーナー確認済み・相談可能",
  OWNER_CONFIRM_REQUIRED: "オーナー確認が必要",
  NOT_AVAILABLE: "民泊利用不可",
  UNKNOWN: "未確認",
};

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** 投資回収期間（月数）を「◯年◯ヶ月」形式に整形 */
export function formatPaybackPeriod(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);
  if (years === 0) return `${remainingMonths}ヶ月`;
  if (remainingMonths === 0) return `${years}年`;
  return `${years}年${remainingMonths}ヶ月`;
}

/**
 * 日時を「3時間前」「2日前」のような相対表示に整形する。
 * 物件の掲載状態（最終確認日時）の表示に使用。
 */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}時間前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}日前`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}ヶ月前`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}年前`;
}
