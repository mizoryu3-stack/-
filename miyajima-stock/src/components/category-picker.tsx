"use client";

import type { Category } from "@/lib/types";
import { CategoryChip } from "./category-icon";

export function CategoryPicker({ categories, value, onChange }: { categories: Category[]; value: string[]; onChange: (ids: string[]) => void }) {
  if (!categories.length) return <p className="text-sm text-muted-foreground">カテゴリーがありません（カテゴリー画面で追加できます）</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((v) => v !== c.id) : [...value, c.id])}
            className="rounded-full transition-transform active:scale-95"
          >
            <CategoryChip name={c.name} color={c.color} icon={c.icon} active={active} />
          </button>
        );
      })}
    </div>
  );
}
