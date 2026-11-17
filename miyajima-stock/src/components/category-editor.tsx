"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCategory } from "@/lib/queries";
import type { Category } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon } from "./category-icon";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Field, Input } from "./ui/input";

export function CategoryEditor({ open, onOpenChange, category }: { open: boolean; onOpenChange: (o: boolean) => void; category: Category | null }) {
  const save = useSaveCategory();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon ?? "tag");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={category ? "カテゴリーを編集" : "カテゴリーを追加"} description="名前を変更しても、登録済み商品との紐付けはそのまま残ります。">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return toast.error("カテゴリー名を入力してください");
            save.mutate(
              { id: category?.id, name, color, icon, sort_order: category ? undefined : 1000 },
              {
                onSuccess: () => { toast.success("保存しました"); onOpenChange(false); },
                onError: (err) => toast.error(errorMessage(err)),
              },
            );
          }}
        >
          <Field label="カテゴリー名" htmlFor="cat-name">
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="例: 2階寝室" />
          </Field>
          <Field label="色">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cn("size-9 rounded-full ring-offset-2 ring-offset-card", color === c && "ring-2 ring-foreground")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </Field>
          <Field label="アイコン">
            <div className="grid grid-cols-8 gap-1.5">
              {Object.keys(CATEGORY_ICONS).map((k) => (
                <button key={k} type="button" aria-label={k} onClick={() => setIcon(k)} className={cn("flex aspect-square items-center justify-center rounded-lg border", icon === k ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground")}>
                  <CategoryIcon icon={k} className="size-4" />
                </button>
              ))}
            </div>
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" /> : null}保存する</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
