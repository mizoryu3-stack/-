function colorClass(score: number): string {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-rose-100 text-rose-800 border-rose-300";
}

export default function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "text-2xl px-4 py-2"
      : size === "sm"
        ? "text-xs px-2 py-0.5"
        : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${colorClass(score)} ${sizeClass}`}
      title="民泊適性スコア（仮ロジックによる暫定値）"
    >
      民泊適性 {score}点
    </span>
  );
}
