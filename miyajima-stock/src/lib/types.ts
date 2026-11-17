export type ItemStatus =
  | "considering"
  | "planned"
  | "ordered"
  | "shipping"
  | "purchased"
  | "installed"
  | "cancelled";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  name: string;
  original_name: string | null;
  item_type: string | null;
  brand: string | null;
  model_number: string | null;
  color: string | null;
  size: string | null;
  description: string | null;
  store: string | null;
  url: string | null;
  planned_unit_price: number | null;
  actual_unit_price: number | null;
  quantity: number;
  shipping_fee: number;
  status: ItemStatus;
  purchase_date: string | null;
  purchase_store: string | null;
  notes: string | null;
  image_path: string | null;
  screenshot_path: string | null;
  screenshot_hash: string | null;
  ai_extracted: unknown;
  created_at: string;
  updated_at: string;
}

/** 一覧取得時はカテゴリーIDを結合して持つ */
export interface ItemWithCategories extends Item {
  category_ids: string[];
}

export interface ItemEvent {
  id: string;
  item_id: string;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export interface OtherExpense {
  id: string;
  user_id: string;
  name: string;
  expense_type: string;
  estimated_amount: number | null;
  actual_amount: number | null;
  is_confirmed: boolean;
  expense_date: string | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  item_id: string | null;
  expense_id: string | null;
  file_path: string;
  file_name: string | null;
  purchase_date: string | null;
  store: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  total_budget: number;
}

/** 商品の入力値（新規・編集共通） */
export type ItemInput = Omit<
  Item,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export const EXPENSE_TYPES = [
  "内装工事費",
  "電気工事費",
  "設備工事費",
  "消防設備費",
  "契約費",
  "許認可・申請費",
  "清掃・リネン",
  "その他",
] as const;
