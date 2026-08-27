import type { ScoreBreakdownItem } from "@/lib/score";

export default function ScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdownItem[] }) {
  return (
    <div className="mt-3 space-y-2">
      {breakdown.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-xs">
          <span className="w-24 shrink-0 text-slate-500">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-500"
              style={{ width: `${item.score}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-slate-500">
            {Math.round(item.score)}点 (重み{Math.round(item.weight * 100)}%)
          </span>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-slate-400">
        ※現時点では家賃・専有面積・駅距離・駐車場・建物種別・築年数のみで算出した仮スコアです。
      </p>
    </div>
  );
}
