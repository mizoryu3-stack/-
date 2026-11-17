import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, icon, href, tone = "default",
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; href?: string; tone?: "default" | "primary" | "accent";
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border p-4 transition-shadow md:p-5",
        tone === "primary" && "border-transparent bg-primary text-primary-foreground",
        tone === "accent" && "bg-accent-soft",
        tone === "default" && "bg-card",
        href && "hover:shadow-md",
      )}
    >
      <div className={cn("flex items-center gap-2 text-[12px] font-medium", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {icon}
        {label}
      </div>
      <div className="text-[22px] font-semibold leading-tight tracking-tight tabular md:text-[26px]">{value}</div>
      {sub ? <div className={cn("text-[12px] tabular", tone === "primary" ? "text-primary-foreground/75" : "text-muted-foreground")}>{sub}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
