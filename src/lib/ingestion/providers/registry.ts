/**
 * 物件データ提供元（Provider）のレジストリ。
 *
 * 概念的には
 *   PropertyProvider
 *   ├─ CSVProvider     （実装済み・push型: 人がファイルを持ち込む）
 *   ├─ AdminProvider   （実装済み・push型: 管理画面からの手動登録）
 *   ├─ HomesProvider   （未接続・pull型: LIFULL HOME'S API、正式契約待ち）
 *   ├─ AkiyabankProvider（未接続・pull型: みんと。/各市空き家バンク、データ提供合意待ち）
 *   └─ ...（将来追加）
 * という構造を、実際にはクラス階層ではなく「メタデータのレジストリ + 既存の関数ベースの
 * アダプタ(src/lib/ingestion/sources/*.ts)」の組み合わせで表現している。
 * プロトタイプの規模で本格的なクラス階層を作るのは過剰設計と判断したため。
 *
 * kind:
 *  - "push": データが外部から持ち込まれる（CSVアップロード・管理画面での手動入力）
 *  - "pull": こちらから能動的にデータを取得しに行く（外部API・スクレイピング等）
 */
export type ProviderKind = "push" | "pull";

export interface ProviderInfo {
  /** Property.source の値と対応する識別子 */
  id: string;
  name: string;
  kind: ProviderKind;
  /** 実際にデータの投入・取得が可能な状態か */
  connected: boolean;
  description: string;
}

export const PROVIDER_REGISTRY: ProviderInfo[] = [
  {
    id: "manual",
    name: "手入力（開発用ダミーデータ）",
    kind: "push",
    connected: true,
    description: "prisma/seed.ts で投入される開発・テスト用のサンプルデータ。",
  },
  {
    id: "admin",
    name: "管理画面からの手動登録",
    kind: "push",
    connected: true,
    description: "/admin/properties/new から1件ずつ登録された物件。",
  },
  {
    id: "csv",
    name: "CSVインポート",
    kind: "push",
    connected: true,
    description: "/admin/import からアップロードされたCSVファイルによる一括登録・更新。",
  },
  {
    id: "homes",
    name: "LIFULL HOME'S API",
    kind: "pull",
    connected: false,
    description: "正式な利用許諾契約が締結されるまで未接続（src/lib/ingestion/sources/homes.ts）。",
  },
  {
    id: "akiyabank",
    name: "空き家バンク（みんと。/各市）",
    kind: "pull",
    connected: false,
    description:
      "広島県・各市からのデータ提供合意が得られるまで未接続（src/lib/ingestion/sources/akiyabank.ts）。",
  },
];

export function findProviderInfo(sourceId: string): ProviderInfo | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === sourceId);
}
