import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errorMessage(e: unknown): string {
  if (!e) return "不明なエラーが発生しました";
  if (typeof e === "string") return e;
  if (e instanceof Error) {
    if (/Failed to fetch|NetworkError|Load failed/i.test(e.message)) {
      return "通信エラーが発生しました。電波状況を確認して再試行してください。";
    }
    return e.message;
  }
  if (typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "不明なエラーが発生しました";
}

export function isSafeHttpUrl(u: string | null | undefined): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
