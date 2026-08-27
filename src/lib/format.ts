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
