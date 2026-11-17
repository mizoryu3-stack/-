import { describe, expect, it } from "vitest";
import { breakdownByCategory, summarizeBudget, summarizeExpenses, summarizeItems, monthlyPurchases } from "./calc";
import { parseYen } from "./format";
import { findDuplicates } from "./duplicates";
import type { Category, ItemWithCategories, ItemStatus, OtherExpense } from "./types";

let n = 0;
function item(p: Partial<ItemWithCategories> & { status: ItemStatus }): ItemWithCategories {
  n += 1;
  return {
    id: `i${n}`, user_id: "u", name: `商品${n}`, original_name: null, item_type: null, brand: null, model_number: null,
    color: null, size: null, description: null, store: null, url: null, planned_unit_price: null, actual_unit_price: null,
    quantity: 1, shipping_fee: 0, purchase_date: null, purchase_store: null, notes: null, image_path: null,
    screenshot_path: null, screenshot_hash: null, ai_extracted: null, created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z", category_ids: [], ...p,
  };
}
const cat = (id: string, name: string): Category => ({ id, user_id: "u", name, color: "#000", icon: "tag", sort_order: 0, created_at: "", updated_at: "" });

describe("集計", () => {
  const items = [
    item({ status: "planned", planned_unit_price: 12800, quantity: 2, category_ids: ["wa", "living"] }), // 25600 pending
    item({ status: "purchased", planned_unit_price: 30000, actual_unit_price: 27800, quantity: 1, shipping_fee: 1000, purchase_date: "2026-10-05", category_ids: ["wa"] }), // 28800
    item({ status: "ordered", planned_unit_price: 5000, quantity: 3 }), // 15000 purchased (fallback to planned)
    item({ status: "installed", actual_unit_price: 100000, quantity: 1, purchase_date: "2026-11-02" }), // 100000
    item({ status: "considering", planned_unit_price: 8000, quantity: 1 }), // 8000 pending
    item({ status: "cancelled", planned_unit_price: 99999, quantity: 5 }), // excluded
  ];

  it("購入確定と未購入予定を正しく分け、取り消しを除外する", () => {
    const s = summarizeItems(items);
    expect(s.purchased).toEqual({ count: 3, quantity: 5, amount: 28800 + 15000 + 100000 });
    expect(s.pending).toEqual({ count: 2, quantity: 3, amount: 25600 + 8000 });
    expect(s.excluded.count).toBe(1);
    expect(s.all.amount).toBe(143800 + 33600);
    expect(s.all.count).toBe(5);
    expect(s.registered).toBe(6);
    expect(s.progressRate).toBeCloseTo((143800 / (143800 + 33600)) * 100);
  });

  it("複数タグの商品は全体集計で二重計上されない", () => {
    const s = summarizeItems(items);
    const b = breakdownByCategory(items, [cat("wa", "和室"), cat("living", "リビング")]);
    const wa = b.find((x) => x.id === "wa")!;
    expect(wa.pending).toBe(25600);
    expect(wa.purchased).toBe(28800);
    expect(b.find((x) => x.id === "living")!.pending).toBe(25600);
    // 全体は1回だけ
    expect(s.pending.amount).toBe(33600);
    const un = b.find((x) => x.id === null)!;
    expect(un.purchased).toBe(115000);
  });

  it("購入済みへの変更で購入済み金額が増え未購入予定が減る", () => {
    const before = summarizeItems(items);
    const changed = items.map((i, idx) => (idx === 0 ? { ...i, status: "purchased" as const, actual_unit_price: 12000 } : i));
    const after = summarizeItems(changed);
    expect(after.purchased.amount - before.purchased.amount).toBe(24000);
    expect(before.pending.amount - after.pending.amount).toBe(25600);
  });

  it("月別購入金額", () => {
    expect(monthlyPurchases(items)).toEqual([
      { month: "2026-10", amount: 28800 },
      { month: "2026-11", amount: 100000 },
      { month: "日付未設定", amount: 15000 },
    ]);
  });

  it("予算とその他費用", () => {
    const exp: OtherExpense[] = [
      { id: "e1", user_id: "u", name: "内装", expense_type: "内装工事費", estimated_amount: 500000, actual_amount: 480000, is_confirmed: true, expense_date: null, vendor: null, notes: null, created_at: "", updated_at: "" },
      { id: "e2", user_id: "u", name: "電気", expense_type: "電気工事費", estimated_amount: 200000, actual_amount: null, is_confirmed: false, expense_date: null, vendor: null, notes: null, created_at: "", updated_at: "" },
    ];
    const es = summarizeExpenses(exp);
    expect(es).toEqual({ confirmed: 480000, estimated: 200000, total: 680000, count: 2 });
    const b = summarizeBudget(3800000, summarizeItems(items), es);
    expect(b.spent).toBe(143800 + 480000);
    expect(b.planned).toBe(33600 + 200000);
    expect(b.remaining).toBe(3800000 - 623800);
  });
});

describe("金額の読み取り", () => {
  it("さまざまな表記を整数円にする", () => {
    expect(parseYen("¥12,800")).toBe(12800);
    expect(parseYen("１２，８００円")).toBe(12800);
    expect(parseYen("")).toBeNull();
    expect(parseYen("abc")).toBeNull();
    expect(parseYen(-5)).toBeNull();
  });
});

describe("重複検出", () => {
  const existing = [
    item({ status: "planned", name: "木製ローテーブル", url: "https://www.amazon.co.jp/dp/B0ABCDEFGH?ref=x" }),
    item({ status: "planned", name: "掃除機", model_number: "CV-SP900" }),
  ];
  it("URL・型番・名前で検出", () => {
    expect(findDuplicates({ url: "https://amazon.co.jp/gp/product/B0ABCDEFGH" }, existing)[0].reason).toBe("同じ商品URL");
    expect(findDuplicates({ model_number: "cv-sp900" }, existing)[0].reason).toBe("同じ型番");
    expect(findDuplicates({ name: "木製 ローテーブル" }, existing)[0].reason).toBe("同じ商品名");
    expect(findDuplicates({ name: "座椅子" }, existing)).toHaveLength(0);
  });
});
