import { useMemo, useState } from "react";
import type { SessionStore } from "../lib/useSessions";
import { aggregateByExercise } from "../lib/insights";
import { formatDateJp } from "../lib/format";
import LineChart, { type ChartPoint } from "../components/LineChart";

type Metric = "topWeight" | "volume";

export default function ExerciseProgress({ store }: { store: SessionStore }) {
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of store.sessions) {
      for (const set of s.sets) names.add(set.exerciseName);
    }
    return [...names].sort();
  }, [store.sessions]);

  const [selected, setSelected] = useState(exerciseNames[0] ?? "");
  const [metric, setMetric] = useState<Metric>("topWeight");

  const effectiveSelected = exerciseNames.includes(selected) ? selected : exerciseNames[0] ?? "";

  const data: ChartPoint[] = useMemo(() => {
    if (!effectiveSelected) return [];
    const sorted = [...store.sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
    const result: ChartPoint[] = [];
    for (const s of sorted) {
      const agg = aggregateByExercise(s).find((a) => a.exerciseName === effectiveSelected);
      if (!agg) continue;
      result.push({
        date: s.date,
        value: metric === "topWeight" ? agg.topWeightKg : Math.round(agg.volume),
      });
    }
    return result;
  }, [store.sessions, effectiveSelected, metric]);

  if (exerciseNames.length === 0) {
    return (
      <div className="empty-state">
        <p>まだ記録がありません。記録をつけると種目別の推移が見られます。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>種目別グラフ</h2>
        <div className="field-grid">
          <div className="field-row">
            <label htmlFor="exercise-select">種目</label>
            <select
              id="exercise-select"
              value={effectiveSelected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="metric-select">指標</label>
            <select
              id="metric-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="topWeight">最大重量 (kg)</option>
              <option value="volume">総ボリューム (kg)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{effectiveSelected} - {metric === "topWeight" ? "最大重量の推移" : "総ボリュームの推移"}</h3>
        <LineChart
          data={data}
          seriesLabel={metric === "topWeight" ? "最大重量" : "総ボリューム"}
          unit="kg"
          formatDate={formatDateJp}
        />
      </div>
    </div>
  );
}
