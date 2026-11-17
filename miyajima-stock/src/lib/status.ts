import type { ItemStatus } from "./types";

/**
 * 集計ルール（ダッシュボード・分析で共通）
 *  - purchased グループ（購入確定）: 注文済み / 配送中 / 購入済み / 設置完了
 *  - pending グループ（未購入予定）: 検討中 / 未購入
 *  - excluded（集計対象外）: 購入取り消し
 * 1つの商品はどれか1つのグループにのみ属するため、二重計上は発生しません。
 */
export type StatusGroup = "purchased" | "pending" | "excluded";

export const STATUS_ORDER: ItemStatus[] = [
  "considering",
  "planned",
  "ordered",
  "shipping",
  "purchased",
  "installed",
  "cancelled",
];

export const STATUS_LABEL: Record<ItemStatus, string> = {
  considering: "検討中",
  planned: "未購入",
  ordered: "注文済み",
  shipping: "配送中",
  purchased: "購入済み",
  installed: "設置完了",
  cancelled: "購入取り消し",
};

export const STATUS_GROUP: Record<ItemStatus, StatusGroup> = {
  considering: "pending",
  planned: "pending",
  ordered: "purchased",
  shipping: "purchased",
  purchased: "purchased",
  installed: "purchased",
  cancelled: "excluded",
};

export const GROUP_LABEL: Record<StatusGroup, string> = {
  purchased: "購入確定",
  pending: "未購入予定",
  excluded: "集計対象外",
};

export function statusGroup(s: ItemStatus): StatusGroup {
  return STATUS_GROUP[s];
}

export function isPurchased(s: ItemStatus) {
  return STATUS_GROUP[s] === "purchased";
}

/** バッジの見た目 */
export const STATUS_TONE: Record<ItemStatus, string> = {
  considering: "bg-muted text-muted-foreground",
  planned: "bg-accent-soft text-accent",
  ordered: "bg-primary-soft text-primary",
  shipping: "bg-primary-soft text-primary",
  purchased: "bg-primary text-primary-foreground",
  installed: "bg-primary text-primary-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};
