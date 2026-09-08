import { useCallback, useEffect, useRef, useState } from "react";
import { generateId, loadSessions, saveSessions } from "./storage";
import {
  buildPublishHtml,
  readEmbeddedSessions,
  resolveArtifactCapability,
  type ArtifactNamespace,
} from "./remotePersistence";
import type { BodyFocus, SetEntry, WorkoutSession } from "./types";

export interface DraftSession {
  date: string;
  durationMinutes?: number;
  bodyWeightKg?: number;
  bodyFocus?: BodyFocus;
  memo?: string;
  sets: Array<Omit<SetEntry, "id">>;
}

/** artifact capabilityへのpublishを行う。conflict等の一時的な失敗は仕様上ビューがリロードされるか
 *  次回の保存時に最新状態が再送されるため、ここでは1回だけ軽くリトライして諦める。 */
async function publishWithRetry(artifact: ArtifactNamespace, html: string): Promise<void> {
  try {
    await artifact.publish(html);
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === "upstream_error") {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      await artifact.publish(html).catch(() => {});
    }
    // conflict/not_writer/not_granted等はここでは何もしない。ローカルには保存済み。
  }
}

/** セッションデータの読み書きを一手に引き受けるフック。 */
export function useSessions() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** Artifact自体への永続保存が有効かどうか (claude.ai上で開かれている場合のみtrueになりうる) */
  const [durable, setDurable] = useState(false);

  const sessionsRef = useRef<WorkoutSession[]>([]);
  const artifactRef = useRef<ArtifactNamespace | null>(null);
  const migratedRef = useRef(false);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    // Artifact本体に埋め込まれた記録を最優先で読み、無ければブラウザのlocalStorage (旧方式/移行用) を読む
    const embedded = readEmbeddedSessions();
    const initial = embedded && embedded.length > 0 ? embedded : loadSessions();
    setSessions(initial);
    sessionsRef.current = initial;
    setLoaded(true);

    resolveArtifactCapability().then((ns) => {
      if (!ns) return;
      artifactRef.current = ns;
      setDurable(true);

      // 埋め込みがまだ空 (このArtifactでは一度も永続保存していない) で、
      // ブラウザ側に既存データが残っている場合は、一度だけ永続保存側へ移行する。
      if ((!embedded || embedded.length === 0) && initial.length > 0 && !migratedRef.current) {
        migratedRef.current = true;
        publishWithRetry(ns, buildPublishHtml(initial));
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // ブラウザのlocalStorageにも常にキャッシュしておく (Artifact永続化が使えない環境のフォールバック)
    saveSessions(sessions);
  }, [sessions, loaded]);

  const persistChange = useCallback((next: WorkoutSession[]) => {
    setSessions(next);
    sessionsRef.current = next;
    if (artifactRef.current) {
      publishWithRetry(artifactRef.current, buildPublishHtml(next));
    }
  }, []);

  const addSession = useCallback(
    (draft: DraftSession): WorkoutSession => {
      const now = new Date().toISOString();
      const session: WorkoutSession = {
        id: generateId(),
        date: draft.date,
        durationMinutes: draft.durationMinutes,
        bodyWeightKg: draft.bodyWeightKg,
        bodyFocus: draft.bodyFocus,
        memo: draft.memo,
        sets: draft.sets.map((s) => ({ ...s, id: generateId() })),
        createdAt: now,
        updatedAt: now,
      };
      persistChange([...sessionsRef.current, session]);
      return session;
    },
    [persistChange],
  );

  const updateSession = useCallback(
    (id: string, draft: DraftSession) => {
      const next = sessionsRef.current.map((s) =>
        s.id === id
          ? {
              ...s,
              date: draft.date,
              durationMinutes: draft.durationMinutes,
              bodyWeightKg: draft.bodyWeightKg,
              bodyFocus: draft.bodyFocus,
              memo: draft.memo,
              sets: draft.sets.map((set) => ({ ...set, id: generateId() })),
              updatedAt: new Date().toISOString(),
            }
          : s,
      );
      persistChange(next);
    },
    [persistChange],
  );

  const deleteSession = useCallback(
    (id: string) => {
      persistChange(sessionsRef.current.filter((s) => s.id !== id));
    },
    [persistChange],
  );

  return { sessions, loaded, durable, addSession, updateSession, deleteSession };
}

export type SessionStore = ReturnType<typeof useSessions>;
