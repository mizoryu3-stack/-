import { statusGroup } from "./status";
import type { Category, Item, ItemWithCategories, OtherExpense } from "./types";

/** 予定単価 × 数量 + 送料 */
export function plannedTotal(item: Pick<Item, "planned_unit_price" | "quantity" | "shipping_fee">): number {
  return (item.planned_unit_price ?? 0) * item.quantity + (item.shipping_fee ?? 0);
}

/** 実際の購入単価（未入力なら予定単価）× 数量 + 送料 */
export function actualTotal(
  item: Pick<Item, "planned_unit_price" | "actual_unit_price" | "quantity" | "shipping_fee">,
): number {
  const unit = item.actual_unit_price ?? item.planned_unit_price ?? 0;
  return unit * item.quantity + (item.shipping_fee ?? 0);
}

/** 商品の表示用単価（購入確定なら実績、それ以外は予定） */
export function effectiveUnitPrice(item: Pick<Item, "status" | "planned_unit_price" | "actual_unit_price">): number | null {
  if (statusGroup(item.status) === "purchased") return item.actual_unit_price ?? item.planned_unit_price;
  return item.planned_unit_price;
}

/** 商品の集計用金額（ステータスに応じて実績 or 予定） */
export function effectiveTotal(item: Item): number {
  const g = statusGroup(item.status);
  if (g === "purchased") return actualTotal(item);
  if (g === "pending") return plannedTotal(item);
  return 0;
}

export interface Bucket {
  count: number; // 登録件数
  quantity: number; // 数量合計
  amount: number; // 金額
}

export interface ItemSummary {
  purchased: Bucket;
  pending: Bucket;
  excluded: Bucket;
  all: Bucket; // 取り消しを除く全商品
  registered: number; // 取り消し含む全登録件数
  progressRate: number; // 0〜100
}

const emptyBucket = (): Bucket => ({ count: 0, quantity: 0, amount: 0 });

export function summarizeItems(items: Item[]): ItemSummary {
  const s = { purchased: emptyBucket(), pending: emptyBucket(), excluded: emptyBucket() };
  for (const it of items) {
    const g = statusGroup(it.status);
    const b = s[g];
    b.count += 1;
    b.quantity += it.quantity;
    b.amount += g === "excluded" ? 0 : effectiveTotal(it);
  }
  const all: Bucket = {
    count: s.purchased.count + s.pending.count,
    quantity: s.purchased.quantity + s.pending.quantity,
    amount: s.purchased.amount + s.pending.amount,
  };
  const denom = s.purchased.amount + s.pending.amount;
  const progressRate = denom > 0 ? (s.purchased.amount / denom) * 100 : 0;
  return { ...s, all, registered: items.length, progressRate };
}

export interface CategoryBreakdown {
  id: string | null; // null = 未分類
  name: string;
  color: string;
  purchased: number;
  pending: number;
  count: number;
}

/**
 * カテゴリー別集計。
 * 複数カテゴリーが付いた商品は各カテゴリーに計上されます（カテゴリー別の内訳表示用）。
 * 全体合計は summarizeItems を使うため二重計上されません。
 */
export function breakdownByCategory(items: ItemWithCategories[], categories: Category[]): CategoryBreakdown[] {
  const map = new Map<string | null, CategoryBreakdown>();
  for (const c of categories) {
    map.set(c.id, { id: c.id, name: c.name, color: c.color, purchased: 0, pending: 0, count: 0 });
  }
  const uncategorized: CategoryBreakdown = { id: null, name: "未分類", color: "#8a8a8a", purchased: 0, pending: 0, count: 0 };
  for (const it of items) {
    const g = statusGroup(it.status);
    if (g === "excluded") continue;
    const ids = it.category_ids.filter((id) => map.has(id));
    const targets = ids.length ? ids.map((id) => map.get(id)!) : [uncategorized];
    const amount = effectiveTotal(it);
    for (const t of targets) {
      t.count += 1;
      if (g === "purchased") t.purchased += amount;
      else t.pending += amount;
    }
  }
  const out = [...map.values()];
  if (uncategorized.count) out.push(uncategorized);
  return out;
}

/** 月別購入金額（購入確定のみ、購入日基準。購入日なしは「日付未設定」） */
export function monthlyPurchases(items: Item[]): { month: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const it of items) {
    if (statusGroup(it.status) !== "purchased") continue;
    const key = it.purchase_date ? it.purchase_date.slice(0, 7) : "日付未設定";
    map.set(key, (map.get(key) ?? 0) + actualTotal(it));
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === "日付未設定" ? 1 : b === "日付未設定" ? -1 : a.localeCompare(b)))
    .map(([month, amount]) => ({ month, amount }));
}

/** 購入先別支出（購入確定のみ） */
export function spendingByStore(items: Item[]): { store: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const it of items) {
    if (statusGroup(it.status) !== "purchased") continue;
    const key = (it.purchase_store || it.store || "不明").trim() || "不明";
    const cur = map.get(key) ?? { amount: 0, count: 0 };
    cur.amount += actualTotal(it);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()].map(([store, v]) => ({ store, ...v })).sort((a, b) => b.amount - a.amount);
}

export interface ExpenseSummary {
  confirmed: number; // 実績確定額
  estimated: number; // 見積（未確定）額
  total: number;
  count: number;
}

export function summarizeExpenses(expenses: OtherExpense[]): ExpenseSummary {
  let confirmed = 0;
  let estimated = 0;
  for (const e of expenses) {
    if (e.is_confirmed) confirmed += e.actual_amount ?? e.estimated_amount ?? 0;
    else estimated += e.estimated_amount ?? 0;
  }
  return { confirmed, estimated, total: confirmed + estimated, count: expenses.length };
}

export interface BudgetSummary {
  budget: number;
  spent: number; // 確定支出（商品購入確定 + その他費用の実績）
  planned: number; // 今後の予定（未購入予定 + 見積）
  remaining: number; // 予算 − 確定支出
  remainingAfterPlanned: number; // 予算 − 確定支出 − 今後の予定
  spentRate: number;
}

export function summarizeBudget(budget: number, items: ItemSummary, expenses: ExpenseSummary): BudgetSummary {
  const spent = items.purchased.amount + expenses.confirmed;
  const planned = items.pending.amount + expenses.estimated;
  return {
    budget,
    spent,
    planned,
    remaining: budget - spent,
    remainingAfterPlanned: budget - spent - planned,
    spentRate: budget > 0 ? (spent / budget) * 100 : 0,
  };
}
