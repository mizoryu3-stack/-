import { useMemo, useState } from "react";
import type { SessionStore } from "../lib/useSessions";
import { aggregateByExercise } from "../lib/insights";
import { formatDateJp, formatSigned } from "../lib/format";
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

  const bodyWeightData: ChartPoint[] = useMemo(() => {
    const sorted = [...store.sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
    return sorted
      .filter((s) => typeof s.bodyWeightKg === "number" && s.bodyWeightKg > 0)
      .map((s) => ({ date: s.date, value: s.bodyWeightKg as number }));
  }, [store.sessions]);

  if (store.sessions.length === 0) {
    return (
      <div className="empty-state">
        <p>まだ記録がありません。記録をつけると種目別の推移が見られます。</p>
      </div>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const delta = first && last ? last.value - first.value : null;
  const unit = "kg";

  const bwFirst = bodyWeightData[0];
  const bwLast = bodyWeightData[bodyWeightData.length - 1];
  const bwDelta = bwFirst && bwLast ? bwLast.value - bwFirst.value : null;

  return (
    <div>
      <div className="card">
        <h2>種目別グラフ</h2>
        {exerciseNames.length === 0 ? (
          <p className="helper-text">まだ種目が記録されていません。</p>
        ) : (
          <>
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

            {first && last && (
              <div className="stat-grid">
                <div className="stat-tile">
                  <div className="label">初回 ({formatDateJp(first.date)})</div>
                  <div className="value">
                    {first.value}
                    {unit}
                  </div>
                </div>
                <div className="stat-tile">
                  <div className="label">最新 ({formatDateJp(last.date)})</div>
                  <div className="value">
                    {last.value}
                    {unit}
                  </div>
                </div>
                <div className="stat-tile">
                  <div className="label">これまでの伸び</div>
                  <div className={`value ${delta !== null && delta >= 0 ? "delta-up" : "delta-down"}`}>
                    {delta !== null ? formatSigned(delta) : "-"}
                    {unit}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {exerciseNames.length > 0 && (
        <div className="card">
          <h3>
            {effectiveSelected} - {metric === "topWeight" ? "最大重量の推移" : "総ボリュームの推移"}
          </h3>
          <LineChart
            data={data}
            seriesLabel={metric === "topWeight" ? "最大重量" : "総ボリューム"}
            unit="kg"
            formatDate={formatDateJp}
          />
        </div>
      )}

      <div className="card">
        <h2>体重の推移</h2>
        {bodyWeightData.length === 0 ? (
          <p className="helper-text">
            記録時に体重を入力すると、ここに推移が表示されます。
          </p>
        ) : (
          <>
            {bwFirst && bwLast && (
              <div className="stat-grid">
                <div className="stat-tile">
                  <div className="label">初回 ({formatDateJp(bwFirst.date)})</div>
                  <div className="value">{bwFirst.value}kg</div>
                </div>
                <div className="stat-tile">
                  <div className="label">最新 ({formatDateJp(bwLast.date)})</div>
                  <div className="value">{bwLast.value}kg</div>
                </div>
                <div className="stat-tile">
                  <div className="label">増減</div>
                  <div className="value">{bwDelta !== null ? formatSigned(bwDelta) : "-"}kg</div>
                </div>
              </div>
            )}
            <LineChart
              data={bodyWeightData}
              seriesLabel="体重"
              unit="kg"
              color="var(--series-2)"
              formatDate={formatDateJp}
            />
          </>
        )}
      </div>
    </div>
  );
}
