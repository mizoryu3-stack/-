"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatYen, parseYen } from "@/lib/format";
import { useUpdateBudget } from "@/lib/queries";
import { errorMessage } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function BudgetEditor({ budget }: { budget: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budget));
  const update = useUpdateBudget();
  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold tabular">{formatYen(budget)}</span>
        <Button variant="ghost" size="sm" onClick={() => { setValue(String(budget)); setEditing(true); }}><Pencil /> 変更</Button>
      </div>
    );
  }
  const submit = () => {
    const v = parseYen(value);
    if (v === null) return toast.error("金額を数字で入力してください");
    update.mutate(v, {
      onSuccess: () => { toast.success("予算を更新しました"); setEditing(false); },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-48" aria-label="総予算（円）" autoFocus />
      <Button size="sm" type="submit" disabled={update.isPending}>{update.isPending ? <Loader2 className="animate-spin" /> : <Check />}保存</Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>取消</Button>
    </form>
  );
}
