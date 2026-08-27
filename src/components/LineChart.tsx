import { useMemo, useRef, useState } from "react";

export interface ChartPoint {
  date: string;
  value: number;
}

interface Props {
  data: ChartPoint[];
  seriesLabel: string;
  unit: string;
  color?: string;
  formatDate: (date: string) => string;
}

const WIDTH = 600;
const HEIGHT = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

export default function LineChart({
  data,
  seriesLabel,
  unit,
  color = "var(--series-1)",
  formatDate,
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const { points, yTicks, minY, maxY } = useMemo(() => {
    if (data.length === 0) {
      return { points: [] as { x: number; y: number; d: ChartPoint }[], yTicks: [] as number[], minY: 0, maxY: 0 };
    }
    const values = data.map((d) => d.value);
    let minY = Math.min(...values);
    let maxY = Math.max(...values);
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const rangePad = (maxY - minY) * 0.1;
    minY -= rangePad;
    maxY += rangePad;

    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const points = data.map((d, i) => {
      const x =
        data.length === 1
          ? PAD_LEFT + innerW / 2
          : PAD_LEFT + (i / (data.length - 1)) * innerW;
      const y = PAD_TOP + innerH - ((d.value - minY) / (maxY - minY)) * innerH;
      return { x, y, d };
    });

    const rawTicks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4);
    // 値域が狭いと丸め後に重複するので、表示上ユニークな目盛りだけ残す
    const seen = new Set<number>();
    const yTicks = rawTicks.filter((t) => {
      const rounded = Math.round(t);
      if (seen.has(rounded)) return false;
      seen.add(rounded);
      return true;
    });

    return { points, yTicks, minY, maxY };
  }, [data]);

  if (data.length === 0) {
    return <p className="helper-text">まだデータがありません。</p>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${seriesLabel}の推移グラフ`}
        style={{ width: "100%", height: "auto", touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {/* 横方向の目盛線 (recessive) */}
        {yTicks.map((t, i) => {
          const y = PAD_TOP + innerH - ((t - minY) / (maxY - minY || 1)) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {Math.round(t)}
              </text>
            </g>
          );
        })}

        {/* データ線 */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X軸ラベル (最初と最後) */}
        <text x={points[0].x} y={HEIGHT - 8} fontSize={10} fill="var(--text-muted)" textAnchor="start">
          {formatDate(points[0].d.date)}
        </text>
        {points.length > 1 && (
          <text
            x={points[points.length - 1].x}
            y={HEIGHT - 8}
            fontSize={10}
            fill="var(--text-muted)"
            textAnchor="end"
          >
            {formatDate(points[points.length - 1].d.date)}
          </text>
        )}

        {/* クロスヘア */}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--baseline)"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={5} fill={color} stroke="var(--surface-2)" strokeWidth={2} />
          </>
        )}
      </svg>

      {hovered && (
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "baseline",
            fontSize: "0.85rem",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 10px",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>{formatDate(hovered.d.date)}</span>
          <strong>
            {hovered.d.value}
            {unit}
          </strong>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "表を閉じる" : "表で見る"}
        </button>
      </div>

      {showTable && (
        <table className="comparison-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>日付</th>
              <th>{seriesLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{formatDate(d.date)}</td>
                <td>
                  {d.value}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
