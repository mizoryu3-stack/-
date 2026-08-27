import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SessionStore } from "../lib/useSessions";
import type { NewSetInput } from "../lib/types";
import { todayStr } from "../lib/format";

interface Props {
  store: SessionStore;
  mode: "new" | "edit";
}

interface SetRow extends NewSetInput {
  key: string;
}

let rowKeySeq = 0;
function nextRowKey() {
  rowKeySeq += 1;
  return `row-${rowKeySeq}`;
}

function emptyRow(exerciseName = ""): SetRow {
  return { key: nextRowKey(), exerciseName, weightKg: 0, reps: 10 };
}

export default function SessionFormPage({ store, mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = mode === "edit" ? store.sessions.find((s) => s.id === id) : undefined;

  const [date, setDate] = useState(existing?.date ?? todayStr());
  const [durationMinutes, setDurationMinutes] = useState<string>(
    existing?.durationMinutes ? String(existing.durationMinutes) : "",
  );
  const [bodyWeightKg, setBodyWeightKg] = useState<string>(
    existing?.bodyWeightKg ? String(existing.bodyWeightKg) : "",
  );
  const [memo, setMemo] = useState(existing?.memo ?? "");
  const [rows, setRows] = useState<SetRow[]>(
    existing && existing.sets.length > 0
      ? existing.sets.map((s) => ({ key: nextRowKey(), exerciseName: s.exerciseName, weightKg: s.weightKg, reps: s.reps }))
      : [emptyRow()],
  );

  const knownExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of store.sessions) {
      for (const set of s.sets) names.add(set.exerciseName);
    }
    return [...names].sort();
  }, [store.sessions]);

  function updateRow(key: string, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, emptyRow(last?.exerciseName ?? "")]);
  }

  function duplicateRow(key: string) {
    const target = rows.find((r) => r.key === key);
    if (!target) return;
    const idx = rows.findIndex((r) => r.key === key);
    const copy = { ...target, key: nextRowKey() };
    setRows((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
  }

  const canSubmit = rows.some((r) => r.exerciseName.trim() !== "" && r.weightKg >= 0 && r.reps > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sets: NewSetInput[] = rows
      .filter((r) => r.exerciseName.trim() !== "" && r.reps > 0)
      .map((r) => ({ exerciseName: r.exerciseName.trim(), weightKg: r.weightKg, reps: r.reps }));

    if (sets.length === 0) return;

    const draft = {
      date,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      bodyWeightKg: bodyWeightKg ? Number(bodyWeightKg) : undefined,
      memo: memo.trim() || undefined,
      sets,
    };

    if (mode === "edit" && existing) {
      store.updateSession(existing.id, draft);
      navigate(`/sessions/${existing.id}`);
    } else {
      const created = store.addSession(draft);
      navigate(`/sessions/${created.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <h2>{mode === "edit" ? "記録を編集" : "トレーニングを記録"}</h2>

        <div className="field-grid">
          <div className="field-row">
            <label htmlFor="date">日付</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field-row">
            <label htmlFor="duration">トレーニング時間 (分)</label>
            <input
              id="duration"
              type="number"
              min={0}
              placeholder="例: 60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <label htmlFor="bodyWeight">体重 (kg) - 任意・消費カロリー計算に使用</label>
          <input
            id="bodyWeight"
            type="number"
            step="0.1"
            min={0}
            placeholder="例: 65"
            value={bodyWeightKg}
            onChange={(e) => setBodyWeightKg(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h2>セット記録</h2>
        <datalist id="exercise-names">
          {knownExerciseNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        {rows.map((row, idx) => (
          <div className="set-row" key={row.key}>
            <div className="set-row-top">
              <span className="set-index">{idx + 1}</span>
              <input
                type="text"
                className="set-exercise-input"
                placeholder="種目名 (例: ベンチプレス)"
                value={row.exerciseName}
                list="exercise-names"
                onChange={(e) => updateRow(row.key, { exerciseName: e.target.value })}
                required
              />
            </div>
            <div className="set-row-bottom">
              <input
                type="number"
                step="0.5"
                min={0}
                placeholder="重量"
                value={row.weightKg}
                onChange={(e) => updateRow(row.key, { weightKg: Number(e.target.value) })}
              />
              <span className="unit">kg</span>
              <input
                type="number"
                min={1}
                placeholder="回数"
                value={row.reps}
                onChange={(e) => updateRow(row.key, { reps: Number(e.target.value) })}
              />
              <span className="unit">回</span>
              <button
                type="button"
                className="set-row-icon-btn"
                title="このセットをコピー"
                onClick={() => duplicateRow(row.key)}
              >
                ⧉
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="set-row-icon-btn set-row-icon-btn-danger"
                  title="このセットを削除"
                  onClick={() => removeRow(row.key)}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="btn" style={{ marginTop: 4 }} onClick={addRow}>
          + セットを追加
        </button>
      </div>

      <div className="card">
        <h2>メモ</h2>
        <textarea
          rows={3}
          placeholder="調子や気づいたことなど (任意)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 8 }}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
        {mode === "edit" ? "更新する" : "保存して振り返りを見る"}
      </button>
    </form>
  );
}
