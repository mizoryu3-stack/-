import { listingStatusLabel } from "@/lib/format";

type ListingStatus = "ACTIVE" | "ENDED" | "UNKNOWN";

const COLOR_CLASS: Record<ListingStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ENDED: "bg-slate-200 text-slate-600 border-slate-300",
  UNKNOWN: "bg-amber-100 text-amber-800 border-amber-300",
};

export default function ListingStatusBadge({
  status,
  size = "md",
}: {
  status: ListingStatus;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${COLOR_CLASS[status]} ${sizeClass}`}
    >
      {listingStatusLabel[status]}
    </span>
  );
}
