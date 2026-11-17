"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { removeFiles } from "./storage";
import { getSupabase } from "./supabase/client";
import type {
  Category,
  Item,
  ItemEvent,
  ItemInput,
  ItemStatus,
  ItemWithCategories,
  OtherExpense,
  Receipt,
  UserSettings,
} from "./types";

export const qk = {
  items: ["items"] as const,
  categories: ["categories"] as const,
  settings: ["settings"] as const,
  expenses: ["expenses"] as const,
  receipts: (scope: string) => ["receipts", scope] as const,
  events: (itemId: string) => ["item-events", itemId] as const,
};

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* 取得                                                                 */
/* ------------------------------------------------------------------ */

export function useItems() {
  return useQuery({
    queryKey: qk.items,
    queryFn: async (): Promise<ItemWithCategories[]> => {
      const { data, error } = await getSupabase()
        .from("items")
        .select("*, item_categories(category_id)")
        .order("created_at", { ascending: false });
      throwIf(error);
      return (data ?? []).map((row) => {
        const { item_categories, ...rest } = row as Item & { item_categories: { category_id: string }[] };
        return { ...rest, category_ids: (item_categories ?? []).map((c) => c.category_id) };
      });
    },
  });
}

export function useItem(id: string) {
  const items = useItems();
  return { ...items, data: items.data?.find((i) => i.id === id) };
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async (): Promise<Category[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("created_at");
      throwIf(error);
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: async (): Promise<UserSettings> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("user_settings").select("user_id,total_budget").maybeSingle();
      throwIf(error);
      if (data) return data;
      // 初回のみ: 初期設定と初期カテゴリーを作成
      const { error: rpcError } = await supabase.rpc("ensure_my_defaults");
      throwIf(rpcError);
      const again = await supabase.from("user_settings").select("user_id,total_budget").single();
      throwIf(again.error);
      return again.data!;
    },
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: qk.expenses,
    queryFn: async (): Promise<OtherExpense[]> => {
      const { data, error } = await getSupabase()
        .from("other_expenses")
        .select("*")
        .order("created_at", { ascending: false });
      throwIf(error);
      return data ?? [];
    },
  });
}

export function useReceipts(scope: { itemId?: string; expenseId?: string; all?: boolean }) {
  const key = scope.all ? "all" : scope.itemId ? `item:${scope.itemId}` : `expense:${scope.expenseId}`;
  return useQuery({
    queryKey: qk.receipts(key),
    enabled: Boolean(scope.all || scope.itemId || scope.expenseId),
    queryFn: async (): Promise<Receipt[]> => {
      let q = getSupabase().from("receipts").select("*").order("created_at", { ascending: false });
      if (scope.itemId) q = q.eq("item_id", scope.itemId);
      else if (scope.expenseId) q = q.eq("expense_id", scope.expenseId);
      const { data, error } = await q;
      throwIf(error);
      return data ?? [];
    },
  });
}

export function useItemEvents(itemId: string) {
  return useQuery({
    queryKey: qk.events(itemId),
    queryFn: async (): Promise<ItemEvent[]> => {
      const { data, error } = await getSupabase()
        .from("item_events")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(50);
      throwIf(error);
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* 端末間の自動同期（Supabase Realtime）                                 */
/* ------------------------------------------------------------------ */

export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = getSupabase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();
    const flush = () => {
      for (const k of pending) qc.invalidateQueries({ queryKey: [k] });
      pending.clear();
    };
    const schedule = (key: string) => {
      pending.add(key);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 400);
    };
    const channel = supabase
      .channel("miyajima-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        schedule("items");
        schedule("item-events");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "item_categories" }, () => schedule("items"))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => schedule("categories"))
      .on("postgres_changes", { event: "*", schema: "public", table: "other_expenses" }, () => schedule("expenses"))
      .on("postgres_changes", { event: "*", schema: "public", table: "receipts" }, () => schedule("receipts"))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_settings" }, () => schedule("settings"))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/* ------------------------------------------------------------------ */
/* 商品の作成・更新・削除                                               */
/* ------------------------------------------------------------------ */

async function replaceItemCategories(itemId: string, categoryIds: string[]) {
  const supabase = getSupabase();
  const { data: current, error } = await supabase.from("item_categories").select("category_id").eq("item_id", itemId);
  throwIf(error);
  const currentIds = new Set((current ?? []).map((r) => r.category_id as string));
  const next = new Set(categoryIds);
  const toAdd = [...next].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !next.has(id));
  if (toRemove.length) {
    const r = await supabase.from("item_categories").delete().eq("item_id", itemId).in("category_id", toRemove);
    throwIf(r.error);
  }
  if (toAdd.length) {
    const r = await supabase.from("item_categories").insert(toAdd.map((category_id) => ({ item_id: itemId, category_id })));
    throwIf(r.error);
  }
}

export async function createItem(input: Partial<ItemInput> & { name: string }, categoryIds: string[]): Promise<Item> {
  const { data, error } = await getSupabase().from("items").insert(input).select("*").single();
  throwIf(error);
  const item = data as Item;
  if (categoryIds.length) await replaceItemCategories(item.id, categoryIds);
  return item;
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, categoryIds }: { input: Partial<ItemInput> & { name: string }; categoryIds: string[] }) =>
      createItem(input, categoryIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, categoryIds }: { id: string; patch: Partial<ItemInput>; categoryIds?: string[] }) => {
      const { data, error } = await getSupabase().from("items").update(patch).eq("id", id).select("*").single();
      throwIf(error);
      if (categoryIds) await replaceItemCategories(id, categoryIds);
      return data as Item;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.items });
      qc.invalidateQueries({ queryKey: qk.events(v.id) });
    },
  });
}

/** 購入状況の変更（楽観的更新でワンタップ時もすぐ反映） */
export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ItemInput> & { status: ItemStatus } }) => {
      const { error } = await getSupabase().from("items").update(patch).eq("id", id);
      throwIf(error);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.items });
      const prev = qc.getQueryData<ItemWithCategories[]>(qk.items);
      qc.setQueryData<ItemWithCategories[]>(qk.items, (old) => old?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.items, ctx.prev);
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: qk.items });
      qc.invalidateQueries({ queryKey: qk.events(v.id) });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Item) => {
      const supabase = getSupabase();
      const { data: receipts } = await supabase.from("receipts").select("file_path").eq("item_id", item.id);
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      throwIf(error);
      // DB 削除成功後にファイルを削除（失敗しても DB の整合性には影響しない）
      await removeFiles([item.image_path, item.screenshot_path, ...(receipts ?? []).map((r) => r.file_path as string)]).catch(
        () => undefined,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.items });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* カテゴリー                                                           */
/* ------------------------------------------------------------------ */

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { id?: string; name: string; color: string; icon: string; sort_order?: number }) => {
      const supabase = getSupabase();
      const payload = { name: c.name.trim(), color: c.color, icon: c.icon, ...(c.sort_order !== undefined ? { sort_order: c.sort_order } : {}) };
      const res = c.id
        ? await supabase.from("categories").update(payload).eq("id", c.id).select("*").single()
        : await supabase.from("categories").insert(payload).select("*").single();
      if (res.error) {
        if (res.error.code === "23505") throw new Error("同じ名前のカテゴリーがすでにあります");
        throw new Error(res.error.message);
      }
      return res.data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 紐付けのみ削除され、商品そのものは残ります
      const { error } = await getSupabase().from("categories").delete().eq("id", id);
      throwIf(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories });
      qc.invalidateQueries({ queryKey: qk.items });
    },
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: Category[]) => {
      const supabase = getSupabase();
      await Promise.all(
        ordered.map((c, i) => supabase.from("categories").update({ sort_order: (i + 1) * 10 }).eq("id", c.id).then((r) => throwIf(r.error))),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  });
}

/* ------------------------------------------------------------------ */
/* 予算・その他費用・領収書                                              */
/* ------------------------------------------------------------------ */

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (total_budget: number) => {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_settings").upsert({ user_id: auth.user!.id, total_budget });
      throwIf(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

export type ExpenseInput = Omit<OtherExpense, "id" | "user_id" | "created_at" | "updated_at">;

export function useSaveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ExpenseInput }) => {
      const supabase = getSupabase();
      const res = id
        ? await supabase.from("other_expenses").update(input).eq("id", id).select("*").single()
        : await supabase.from("other_expenses").insert(input).select("*").single();
      throwIf(res.error);
      return res.data as OtherExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.expenses }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      const { data: receipts } = await supabase.from("receipts").select("file_path").eq("expense_id", id);
      const { error } = await supabase.from("other_expenses").delete().eq("id", id);
      throwIf(error);
      await removeFiles((receipts ?? []).map((r) => r.file_path as string)).catch(() => undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.expenses });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

export type ReceiptInput = Omit<Receipt, "id" | "user_id" | "created_at">;

export function useAddReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceiptInput) => {
      const { error } = await getSupabase().from("receipts").insert(input);
      throwIf(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Receipt) => {
      const { error } = await getSupabase().from("receipts").delete().eq("id", r.id);
      throwIf(error);
      await removeFiles([r.file_path]).catch(() => undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  });
}
