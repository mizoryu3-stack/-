"use client";

import { useTransition } from "react";
import { toggleFavorite } from "@/app/actions";

export default function FavoriteButton({
  propertyId,
  initialFavorited,
}: {
  propertyId: number;
  initialFavorited: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleFavorite(propertyId))}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
        initialFavorited
          ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {initialFavorited ? "★ お気に入り登録済み" : "☆ お気に入りに追加"}
    </button>
  );
}
