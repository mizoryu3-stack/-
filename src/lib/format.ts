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
