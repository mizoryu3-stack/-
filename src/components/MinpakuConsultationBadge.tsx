import { minpakuConsultationStatusLabel, type MinpakuConsultationStatus } from "@/lib/format";

// 「民泊可能」という断定を避けるため、色・絵文字はあくまで確認状況の目安として提示する
// （🟢=確認済み・相談可能 🟡=要確認 🔴=不可 ⚪=未確認）。listingStatusとは別の表示。
const EMOJI: Record<MinpakuConsultationStatus, string> = {
  OWNER_CONFIRMED_AVAILABLE: "🟢",
  OWNER_CONFIRM_REQUIRED: "🟡",
  NOT_AVAILABLE: "🔴",
  UNKNOWN: "⚪",
};

const COLOR_CLASS: Record<MinpakuConsultationStatus, string> = {
  OWNER_CONFIRMED_AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  OWNER_CONFIRM_REQUIRED: "bg-amber-100 text-amber-800 border-amber-300",
  NOT_AVAILABLE: "bg-red-100 text-red-800 border-red-300",
  UNKNOWN: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function MinpakuConsultationBadge({
  status,
  size = "md",
}: {
  status: MinpakuConsultationStatus;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${COLOR_CLASS[status]} ${sizeClass}`}
    >
      <span aria-hidden="true">{EMOJI[status]}</span>
      {minpakuConsultationStatusLabel[status]}
    </span>
  );
}
