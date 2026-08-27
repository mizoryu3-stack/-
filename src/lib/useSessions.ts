import { useCallback, useEffect, useState } from "react";
import { generateId, loadSessions, saveSessions } from "./storage";
import type { SetEntry, WorkoutSession } from "./types";

export interface DraftSession {
  date: string;
  durationMinutes?: number;
  bodyWeightKg?: number;
  memo?: string;
  sets: Array<Omit<SetEntry, "id">>;
}

/** セッションデータの読み書きを一手に引き受けるフック。 */
export function useSessions() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveSessions(sessions);
  }, [sessions, loaded]);

  const addSession = useCallback((draft: DraftSession): WorkoutSession => {
    const now = new Date().toISOString();
    const session: WorkoutSession = {
      id: generateId(),
      date: draft.date,
      durationMinutes: draft.durationMinutes,
      bodyWeightKg: draft.bodyWeightKg,
      memo: draft.memo,
      sets: draft.sets.map((s) => ({ ...s, id: generateId() })),
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [...prev, session]);
    return session;
  }, []);

  const updateSession = useCallback(
    (id: string, draft: DraftSession) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                date: draft.date,
                durationMinutes: draft.durationMinutes,
                bodyWeightKg: draft.bodyWeightKg,
                memo: draft.memo,
                sets: draft.sets.map((set) => ({
                  ...set,
                  id: generateId(),
                })),
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    },
    [],
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, loaded, addSession, updateSession, deleteSession };
}

export type SessionStore = ReturnType<typeof useSessions>;
