# 民泊物件サーチ（プロトタイプ）

民泊運営者向けに「この賃貸物件を借りて民泊をしたら儲かりそうか？」を判断しやすくするための物件検索アプリです。

現在は **広島県（広島市・廿日市市・呉市・東広島市）** のサンプルデータに対応しています。実物件サイトからのデータ取得は行っておらず、外部データを取り込める構造だけを用意した段階です。

## 主な機能

- **物件検索**（スマホ最適化）: 地域・家賃上限・戸建て/マンション・間取り・専有面積・築年数・駅徒歩・駐車場・敷金・礼金で絞り込み。現在の検索条件をチップで一覧表示し、並び替え（民泊適性スコア順／想定利益順／家賃が安い順／新着順）にも対応
- **物件カード**: 写真枠・民泊適性スコア・想定月間利益を一目で確認できるデザイン
- **民泊適性スコア**: 家賃・専有面積・駅距離・駐車場・建物種別・築年数に加え、周辺観光地の近さ・周辺競合民泊の数・地域の民泊規制レベル（仮の目安）から算出する参考スコア。各要素の評価理由を表示（`src/lib/score.ts`）
- **物件詳細 + 民泊分析**: 物件情報に加え、スコアの内訳・理由、周辺観光地一覧、競合状況を表示
- **収益シミュレーション**: 家賃・宿泊単価・稼働率・水道光熱費・清掃費・消耗品費・OTA手数料率・その他経費をその場で自由に編集し、月間売上・月間利益・年間利益・想定利回り・投資回収期間をリアルタイム再計算（`src/lib/simulation.ts`）
- **お気に入り**: 登録/解除、一覧でスコア・想定利益（月/年）を比較

## 技術スタック

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite（`better-sqlite3` ドライバアダプタ）

## セットアップ

```bash
npm install
npm run db:migrate   # DBスキーマ作成（初回のみ）
npm run db:seed      # 広島県のサンプル物件データ投入
npm run dev
```

http://localhost:3000 を開いてください。

## データフローの構造（外部データ取込に備えた設計）

```
物件データ（外部サイト・手入力など）
        ↓
データ取得レイヤー（src/lib/ingestion）
        ↓
データベース（Property / SimulationInput / NearbyAttraction / CompetitorListing）
        ↓
民泊分析（src/lib/score.ts, src/lib/simulation.ts）
        ↓
検索画面・詳細画面
```

- `src/lib/ingestion/types.ts` — 外部データソースが満たすべき正規化形式 `RawListingInput`
- `src/lib/ingestion/ingestProperty.ts` — スコア計算込みでDBに反映する唯一の入り口
- `src/lib/ingestion/sources/manual.ts` — 現時点で唯一のデータソース（手入力の広島県サンプルデータ）
- `src/app/api/properties/ingest/route.ts` — 将来の外部データ取込用API（`INGEST_API_TOKEN`未設定時は無効化）

詳しくは [`src/lib/ingestion/README.md`](src/lib/ingestion/README.md) を参照してください。

**注意**: SUUMO・HOME'S・アットホーム等からの自動取得（スクレイピング等）は、各サイトの利用規約・APIの利用条件の確認が必要なため、本プロジェクトでは意図的に未実装としています。

## 対象エリアの拡張

対応エリアは `src/lib/regions.ts` の `SUPPORTED_AREAS` で管理しています。全国対応する場合はここに都道府県・市区町村を追加するだけでよく、検索画面のセレクトやスコアリング（民泊規制レベル）は自動的にこの設定を参照します。

## 民泊適性スコア・規制情報についての注意

民泊適性スコアおよび地域の民泊規制レベルはプロトタイプの仮ロジックによる参考値です。住宅宿泊事業法の180日制限、旅館業許可の可否、マンション管理規約、自治体ごとの条例などの法的な民泊可否を判定・保証するものではありません。実際の運営前に必ず自治体・保健所・管理組合等にご確認ください（`src/lib/regions.ts` の `MINPAKU_SCORE_DISCLAIMER`）。

## ディレクトリ構成

```
prisma/
  schema.prisma     # DBスキーマ
  seed.ts           # ingestion層を呼び出す薄いシードスクリプト
src/
  app/
    page.tsx                    # 物件検索画面
    properties/[id]/page.tsx    # 物件詳細 + 民泊分析 + 収益シミュレーション
    favorites/page.tsx          # お気に入り一覧・比較
    actions.ts                  # お気に入り登録/解除の Server Action
    api/properties/ingest/route.ts # 外部データ取込API（現状は無効化）
  components/                   # UI コンポーネント
  lib/
    ingestion/       # データ取得レイヤー（外部データ取込の構造）
    score.ts         # 民泊適性スコアの計算ロジック
    simulation.ts    # 収益シミュレーションの計算ロジック
    regions.ts        # 対応エリア・民泊規制レベルの設定
    propertySimulation.ts # 保存済み初期値からの収益計算ヘルパー
    prisma.ts         # Prisma Client（シングルトン）
```

## 今後の拡張予定（未実装）

- SUUMO / HOME'S / アットホーム等からの物件情報取得（利用規約確認が前提）
- 新着物件の自動取得・条件マッチ通知
- Google Maps 連携、周辺観光地・競合民泊の実データ分析
- 住宅宿泊事業法の180日制限、自治体ごとの民泊規制、旅館業許可の可能性確認（実データに基づく判定）
- AI による物件評価・民泊適性の高度な判定
- 全国エリアへの拡張
