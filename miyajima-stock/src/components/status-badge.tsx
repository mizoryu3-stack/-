import { STATUS_LABEL, STATUS_TONE } from "@/lib/status";
import type { ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_TONE[status], className)}>{STATUS_LABEL[status]}</span>;
}
