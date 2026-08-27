import { formatYen } from "@/lib/format";

function colorClass(profit: number): string {
  if (profit >= 50_000) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (profit >= 0) return "bg-sky-100 text-sky-800 border-sky-300";
  return "bg-rose-100 text-rose-800 border-rose-300";
}

export default function ProfitBadge({
  profit,
  size = "md",
}: {
  profit: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "text-xl px-4 py-2" : size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${colorClass(profit)} ${sizeClass}`}
      title="想定利益（保存された初期シミュレーション値ベース。詳細画面で編集可能）"
    >
      想定利益 {profit >= 0 ? "+" : ""}
      {formatYen(profit)}/月
    </span>
  );
}
