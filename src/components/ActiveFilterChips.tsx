import Link from "next/link";
import type { FilterChip } from "@/lib/filterChips";

export default function ActiveFilterChips({ chips }: { chips: (FilterChip & { href: string })[] }) {
  if (chips.length === 0) {
    return <p className="text-sm text-slate-400">絞り込み条件は設定されていません。</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          {chip.label}
          <span className="text-slate-400">×</span>
        </Link>
      ))}
    </div>
  );
}
