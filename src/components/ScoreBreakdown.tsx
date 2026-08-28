import type { ScoreBreakdownItem } from "@/lib/score";
import { MINPAKU_SCORE_DISCLAIMER } from "@/lib/regions";
import { PUBLIC_DATA_DISCLAIMER } from "@/lib/publicData/types";

export default function ScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdownItem[] }) {
  return (
    <div className="mt-3 space-y-3">
      {breakdown.map((item) => (
        <div key={item.label} className="text-xs">
          <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 font-medium text-slate-600">{item.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-500" style={{ width: `${item.score}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right text-slate-500">
              {Math.round(item.score)}点 (重み{Math.round(item.weight * 100)}%)
            </span>
          </div>
          <p className="mt-1 pl-[8.75rem] text-slate-500">{item.reason}</p>
        </div>
      ))}
      <p className="rounded-md bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">
        ⚠️ {MINPAKU_SCORE_DISCLAIMER}
      </p>
      <p className="rounded-md bg-sky-50 p-2 text-[11px] leading-relaxed text-sky-800">
        ℹ️ {PUBLIC_DATA_DISCLAIMER}
      </p>
    </div>
  );
}
