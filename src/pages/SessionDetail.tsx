import { Link, useNavigate, useParams } from "react-router-dom";
import type { SessionStore } from "../lib/useSessions";
import { buildSessionReview } from "../lib/insights";
import { formatDateJp, formatSigned } from "../lib/format";
import { BODY_FOCUS_LABEL } from "../lib/types";

export default function SessionDetail({ store }: { store: SessionStore }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = store.sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="empty-state">
        <p>記録が見つかりませんでした。</p>
        <Link to="/" className="btn">
          一覧に戻る
        </Link>
      </div>
    );
  }

  const review = buildSessionReview(session, store.sessions);

  function handleDelete() {
    if (!session) return;
    if (window.confirm("この記録を削除しますか?この操作は取り消せません。")) {
      store.deleteSession(session.id);
      navigate("/");
    }
  }

  return (
    <div>
      <div className="top-actions">
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {formatDateJp(session.date)}
          {session.bodyFocus && <span className="pill">{BODY_FOCUS_LABEL[session.bodyFocus]}</span>}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/sessions/${session.id}/edit`} className="btn">
            編集
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            削除
          </button>
        </div>
      </div>

      <div className="card">
        <h2>今回の総評</h2>
        <p style={{ marginTop: 0 }}>{review.summary}</p>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="label">総ボリューム</div>
            <div className="value">{Math.round(review.totalVolume)}kg</div>
            {review.totalVolumeChangePct !== null && (
              <div className={review.totalVolumeChangePct >= 0 ? "delta-up" : "delta-down"}>
                前回比 {formatSigned(review.totalVolumeChangePct)}%
              </div>
            )}
          </div>
          <div className="stat-tile">
            <div className="label">消費カロリー (概算)</div>
            <div className="value">{review.calorie.kcal}kcal</div>
          </div>
          <div className="stat-tile">
            <div className="label">部位</div>
            <div className="value" style={{ fontSize: "1rem" }}>
              {review.categoriesTrained.join("・") || "-"}
            </div>
          </div>
        </div>
        {review.calorie.assumptions.length > 0 && (
          <p className="helper-text">※ {review.calorie.assumptions.join(" / ")}</p>
        )}
      </div>

      {review.focusEvaluation && (
        <div className="card">
          <h2>{session.bodyFocus && BODY_FOCUS_LABEL[session.bodyFocus]}デーの評価</h2>
          <p style={{ margin: 0 }}>{review.focusEvaluation}</p>
        </div>
      )}

      <div className="card">
        <h2>種目別・前回との比較</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>種目</th>
                <th>最高重量</th>
                <th>セット数</th>
                <th>ボリューム</th>
                <th>前回比</th>
              </tr>
            </thead>
            <tbody>
              {review.comparisons.map((c) => (
                <tr key={c.exerciseName}>
                  <td>{c.exerciseName}</td>
                  <td>{c.topWeightKg}kg</td>
                  <td>{c.setCount}</td>
                  <td>{Math.round(c.volume)}kg</td>
                  <td>
                    {c.volumeChangePct === null ? (
                      "初回"
                    ) : (
                      <span className={c.volumeChangePct >= 0 ? "delta-up" : "delta-down"}>
                        {formatSigned(c.volumeChangePct)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>次回への改善提案</h2>
        <ul className="suggestion-list">
          {review.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {session.memo && (
        <div className="card">
          <h2>メモ</h2>
          <p style={{ margin: 0 }}>{session.memo}</p>
        </div>
      )}
    </div>
  );
}
