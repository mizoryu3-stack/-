# 民泊物件サーチ（プロトタイプ）

民泊運営者向けに「この賃貸物件を借りて民泊をしたら儲かりそうか？」を判断しやすくするための物件検索アプリのプロトタイプです。

実物件サイトからのデータ取得は行わず、ダミーデータで検索・スコアリング・収益シミュレーション・お気に入り機能を確認できます。

## 主な機能

- **物件検索**: エリア・家賃上限・戸建て/マンション・専有面積・築年数・駅距離・駐車場・敷金・礼金で絞り込み
- **民泊適性スコア**: 家賃・面積・駅距離・駐車場・建物種別・築年数から算出する仮スコア（0〜100点）。ロジックは `src/lib/score.ts` に分離してあり、将来的に周辺観光地・競合民泊・規制情報などを加味して差し替え可能
- **収益シミュレーション**: 物件詳細画面で宿泊単価・稼働率・経費をその場で自由に編集し、月間売上・想定利益を再計算（`src/lib/simulation.ts`）
- **お気に入り**: 物件をお気に入り登録し、一覧でスコア・想定利益を比較

## 技術スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite（`better-sqlite3` ドライバアダプタ）

## セットアップ

```bash
npm install
npm run db:migrate   # DBスキーマ作成（初回のみ。既に prisma/migrations がある場合は不要）
npm run db:seed      # ダミー物件データ投入
npm run dev
```

http://localhost:3000 を開いてください。

## ディレクトリ構成

```
prisma/
  schema.prisma     # DBスキーマ（Property / SimulationInput / Favorite）
  seed.ts           # ダミー物件データ投入スクリプト
src/
  app/
    page.tsx                 # 物件検索画面
    properties/[id]/page.tsx # 物件詳細 + 収益シミュレーション
    favorites/page.tsx       # お気に入り一覧・比較
    actions.ts               # お気に入り登録/解除の Server Action
  components/                # UI コンポーネント
  lib/
    score.ts        # 民泊適性スコアの計算ロジック（仮）
    simulation.ts    # 収益シミュレーションの計算ロジック
    prisma.ts        # Prisma Client（シングルトン）
```

## 今後の拡張予定（未実装）

- SUUMO / HOME'S 等からの物件情報取得（各サイトの利用規約確認が必要なため現時点では未実装）
- 新着物件の自動取得・条件マッチ通知
- Google Maps 連携、周辺観光地・競合民泊の分析
- 住宅宿泊事業法の180日制限、自治体ごとの民泊規制、旅館業許可の可能性確認
- AI による物件評価・民泊適性の高度な判定
