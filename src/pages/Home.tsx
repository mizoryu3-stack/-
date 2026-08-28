import { Link } from "react-router-dom";
import type { SessionStore } from "../lib/useSessions";
import { sortSessionsByDateDesc } from "../lib/storage";
import { aggregateByExercise, sessionVolume } from "../lib/insights";
import { formatDateJp } from "../lib/format";
import { BODY_FOCUS_LABEL } from "../lib/types";

export default function Home({ store }: { store: SessionStore }) {
  const sessions = sortSessionsByDateDesc(store.sessions);

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <p>まだ記録がありません。</p>
        <Link to="/new" className="btn btn-primary">
          最初の記録をつける
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="top-actions">
        <h2 style={{ margin: 0 }}>記録一覧 ({sessions.length}件)</h2>
        <Link to="/new" className="btn btn-primary">
          + 記録する
        </Link>
      </div>
      {sessions.map((session) => {
        const exercises = aggregateByExercise(session);
        const volume = sessionVolume(session);
        return (
          <Link key={session.id} to={`/sessions/${session.id}`} className="session-list-item">
            <div className="card">
              <div className="session-summary-row">
                <span className="date">
                  {formatDateJp(session.date)}
                  {session.bodyFocus && (
                    <span className="pill" style={{ marginLeft: 8 }}>
                      {BODY_FOCUS_LABEL[session.bodyFocus]}
                    </span>
                  )}
                </span>
                <span className="volume">総ボリューム {Math.round(volume)}kg</span>
              </div>
              {session.memo && <p style={{ margin: "0 0 6px", color: "var(--text-secondary)" }}>{session.memo}</p>}
              <div className="exercise-tags">
                {exercises.map((e) => (
                  <span key={e.exerciseName} className="pill">
                    {e.exerciseName} {e.topWeightKg}kg×{e.topWeightReps}×{e.setCount}set
                  </span>
                ))}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
