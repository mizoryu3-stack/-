"use client";

import { ImageIcon } from "lucide-react";
import { useSignedUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function ItemImage({ path, alt, className, fit = "cover" }: { path: string | null | undefined; alt: string; className?: string; fit?: "cover" | "contain" }) {
  const { data: url, isLoading } = useSignedUrl(path);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")} loading="lazy" />
      ) : (
        <div className={cn("flex size-full items-center justify-center text-muted-foreground/50", isLoading && "animate-pulse")}>
          <ImageIcon className="size-1/3 max-h-10 max-w-10" />
        </div>
      )}
    </div>
  );
}
