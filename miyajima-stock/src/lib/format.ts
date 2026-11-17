const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("ja-JP");

export function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return yen.format(Math.round(v));
}

/** 「12.8万円」のような短縮表記（グラフ軸用） */
export function formatYenShort(v: number): string {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1).replace(/\.0$/, "")}億円`;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1).replace(/\.0$/, "")}万円`;
  return `${num.format(v)}円`;
}

export function formatNumber(v: number): string {
  return num.format(v);
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** YYYY-MM-DD → 2026年11月17日 */
export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${y}年${m}月${day}日`;
}

/** timestamptz → 日本時間の日時 */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

/** YYYY-MM → 2026年11月 */
export function formatMonth(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  if (!y || !mm) return m;
  return `${y}年${mm}月`;
}

/** 「12,800円」「¥12,800」「12800」などを整数に。読めなければ null */
export function parseYen(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? Math.round(input) : null;
  const normalized = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，円¥￥\s]/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
