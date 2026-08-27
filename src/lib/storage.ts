import type { WorkoutSession } from "./types";

const STORAGE_KEY = "kintore-log:sessions:v1";

function isBrowserStorageAvailable(): boolean {
  try {
    const testKey = "__kintore-log-test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadSessions(): WorkoutSession[] {
  if (!isBrowserStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as WorkoutSession[];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: WorkoutSession[]): void {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // 保存に失敗しても致命的ではないため無視する (容量超過等)
  }
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sortSessionsByDateDesc(
  sessions: WorkoutSession[],
): WorkoutSession[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}
