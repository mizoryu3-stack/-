# MIYAJIMA STOCK

宮島で運営する民泊施設の **家具・家電・備品・消耗品** について、購入済み商品と購入予定商品を一元管理する Web アプリです。
Amazon・楽天市場・ニトリなどの商品スクリーンショットをアップロードするだけで、AI（Claude）が商品名・価格などを読み取り、確認画面を経て登録できます。

iPhone と MacBook の両方から利用でき、データは Supabase のクラウドに保存・同期されます。

---

## 主な機能

| 機能 | 内容 |
| --- | --- |
| ダッシュボード | 購入済み／未購入予定／全商品の件数・数量・金額、購入進捗率、予算残り、カテゴリー別グラフ、最近の商品 |
| AIスクリーンショット登録 | 1枚・写真ライブラリ・複数枚（最大20枚）に対応。1枚に複数商品があれば分割。解析前に料金目安を表示し、自動再試行なし。必ず確認画面で修正してから保存 |
| 商品一覧 | 検索、カテゴリー・購入状況・販売サイトで絞り込み、価格／登録日／購入日などで並び替え、PC はグリッド⇔表形式を切替 |
| 購入状況 | 検討中・未購入・注文済み・配送中・購入済み・設置完了・購入取り消し。カードからワンタップで「購入済みに」→ 購入日・実際の金額・購入先を確認して保存 |
| 商品詳細 | 商品画像、元スクリーンショット、予定単価と実際の購入単価（別々に保存）、送料、URL、メモ、領収書（複数）、購入履歴・価格変更の記録 |
| カテゴリー | 追加・名前変更・色・アイコン・並び替え・削除（商品は消えない）。商品に複数カテゴリー可。カテゴリー別ページで購入済み／未購入金額 |
| 支出分析・予算 | 予算（初期 380 万円・変更可）、使用済み・予定込みの残額、カテゴリー別・月別・購入先別、高額商品ランキング |
| その他費用 | 内装工事費・電気工事費・消防設備費・契約費など。見積→実績へ変更可。領収書添付可 |
| 出力 | 商品・その他費用の CSV（UTF-8 BOM 付きで Excel でも文字化けなし）、Excel（.xlsx）、全データの JSON バックアップ |
| 重複登録防止 | 商品名・URL（Amazon の ASIN 含む）・型番・スクリーンショットのハッシュで重複の可能性を警告（意図的な登録は可能） |
| 同期・PWA | Supabase Realtime で iPhone と Mac の画面を自動更新。ホーム画面に追加してアプリのように利用可能。ダークモード対応 |

### 集計ルール（二重計上しない仕組み）

各商品は購入状況によって **必ず1つの区分** にだけ属します。

| 区分 | 購入状況 | 金額 |
| --- | --- | --- |
| 購入確定（購入済み金額） | 注文済み・配送中・購入済み・設置完了 | 実際の購入単価（未入力なら予定単価）× 数量 ＋ 送料 |
| 未購入予定 | 検討中・未購入 | 予定単価 × 数量 ＋ 送料 |
| 集計対象外 | 購入取り消し | 0 |

- 購入進捗率 ＝ 購入済み金額 ÷（購入済み金額 ＋ 未購入予定金額）× 100
- 複数カテゴリーが付いた商品は、カテゴリー別の内訳では各カテゴリーに表示されますが、全体合計には1回だけ計上されます。
- その他費用は商品とは別に集計し、「見積（未確定）」と「実績（確定）」を区別します。
- 予算残り ＝ 予算 −（商品の購入確定額 ＋ その他費用の実績額）

---

## 技術構成

- Next.js 16（App Router）/ TypeScript / Tailwind CSS v4 / shadcn/ui 方式のコンポーネント（Radix UI）
- Supabase（PostgreSQL・Authentication・Storage・Realtime）
- Claude API（`@anthropic-ai/sdk`、構造化出力でスクリーンショット解析）
- TanStack Query（読み込み・エラー・再取得）、Recharts（グラフ）、ExcelJS（xlsx 出力）
- PWA（Web App Manifest ＋ Service Worker）
- Vercel にデプロイ

```
miyajima-stock/
├── src/app/(app)/          画面（ダッシュボード・商品・追加・カテゴリー・分析・費用・設定）
├── src/app/api/analyze/    AI解析 API（サーバー専用。APIキーはここでのみ使用）
├── src/app/login/          ログイン・新規登録
├── src/components/         UI 部品
├── src/lib/calc.ts         金額集計ロジック（単体テストあり）
├── src/lib/queries.ts      Supabase とのデータ連携
├── src/proxy.ts            セッション更新・未ログイン時のリダイレクト
└── supabase/migrations/    データベース構造・RLS・Storage 設定
```

---

## セットアップ

### 1. Supabase プロジェクトを作成

1. <https://supabase.com/> でアカウントを作成し、「New project」でプロジェクトを作成します（Region は **Northeast Asia (Tokyo)** がおすすめ）。無料プランで利用できます。
2. 作成後、左メニュー **SQL Editor** を開き、`supabase/migrations/20261117000000_init.sql` の内容を **全文まとめて** 貼り付けて **Run** を1回押します。
   - テーブル、Row Level Security、非公開 Storage バケット `item-files`、初期カテゴリー作成の仕組みがまとめて作成されます。
   - 全体が1つのトランザクション（`begin` 〜 `commit`）なので、途中でエラーになった場合はすべて取り消され、中途半端な状態は残りません。
   - 「destructive operation」の警告が出た場合は、`drop ... if exists` に反応したものなので、そのまま実行して問題ありません。
   - Supabase CLI を使う場合は `npx supabase link --project-ref <プロジェクトID>` → `npx supabase db push` でも適用できます。
3. **Authentication → URL Configuration** で以下を設定します。
   - Site URL: 本番の URL（例 `https://miyajima-stock.vercel.app`）
   - Redirect URLs: `https://<本番ドメイン>/auth/callback` と `http://localhost:3000/auth/callback`
4. **Project Settings → API**（または画面上部の **Connect**）から「Project URL」と「Publishable key（anon key）」を控えます。

> 自分専用で使う場合は、アカウント登録後に **Authentication → Sign In / Providers → Email** の「Allow new users to sign up」をオフにすると、第三者が新規登録できなくなります。

### 2. Claude API キーを取得

1. <https://console.anthropic.com/> でアカウントを作成し、**Billing** でクレジットを購入します（従量課金）。
2. **API Keys** でキーを作成します。
3. 目安料金：スクリーンショット1枚の解析で約3〜9円（既定モデル `claude-opus-5-5` の場合）。Console の **Limits** で月間の利用上限を設定しておくと安心です。

キーを設定しない場合も、AI解析以外の機能（手入力登録など）はすべて利用できます。

### 3. ローカルで起動

```bash
cd miyajima-stock
cp .env.example .env.local   # 値を書き換える
npm install
npm run dev                  # http://localhost:3000
```

その他のコマンド：

```bash
npm run build      # 本番ビルド（型チェック込み）
npm run lint       # ESLint
npm test           # 集計ロジックなどの単体テスト（Vitest）
npm run test:e2e   # ローカル Supabase を使った画面の通し動作テスト（Docker が必要）
```

### 4. Vercel にデプロイ

1. <https://vercel.com/> で GitHub リポジトリをインポートします。
2. **Root Directory** に `miyajima-stock` を指定します（このリポジトリには別アプリも含まれるため）。
3. **Environment Variables** に `.env.example` の4項目を登録します（`ANTHROPIC_API_KEY` は Production / Preview のみでOK）。
4. Deploy 後、表示された URL を Supabase の Site URL / Redirect URLs に追加します。

---

## iPhone と MacBook での使い方

### iPhone

1. Safari で本番 URL を開き、ログイン（初回は「新規登録」→ 確認メールのリンクを開く）。
2. 画面下の **共有ボタン** →「**ホーム画面に追加**」。以後はホーム画面のアイコンからアプリとして起動できます。
3. 商品の登録：通販アプリで商品ページをスクリーンショット → MIYAJIMA STOCK の中央の **＋** → 「スクリーンショットをアップロード」→ 写真を選択 →「AIで解析する」→ カテゴリー（例：和室）と購入状況を確認 →「登録する」。
4. 購入したら：商品カードの **「購入済みに」** → 実際の金額と購入日を確認 →「購入済みとして保存」。

### MacBook

1. Safari / Chrome で本番 URL を開いて同じアカウントでログインします。左側のサイドバーから各画面に移動できます。
2. 商品一覧はグリッド表示と表形式を切り替えられます。表形式は一覧での確認・比較に便利です。
3. 設定画面から CSV / Excel / JSON バックアップを出力できます。

同じアカウントでログインしていれば、iPhone で登録した商品は Mac の画面にも自動で反映されます（画面を開いたまま数秒で更新）。

---

## セキュリティ

- **Row Level Security**：すべてのテーブルで「ログイン中の本人のデータのみ」読み書き可能。他人の商品・カテゴリーとの紐付けもトリガーで拒否します。
- **Storage**：バケット `item-files` は非公開。パスの先頭がユーザーIDのフォルダにのみアクセス可能で、画像は有効期限付きの署名付き URL で表示します。
- **APIキー**：`ANTHROPIC_API_KEY` はサーバー側（`/api/analyze`）でのみ使用し、ブラウザには送られません。解析 API はログイン済みユーザーのみ利用可能です。
- **AI の扱い**：AIの読み取り結果は自動保存せず、必ず確認画面でユーザーが確定します。価格・URLなど画像にない情報は推測させません。
- CSV 出力は Excel の数式インジェクション対策済みです。

## バックアップと運用

- Supabase 無料プランは自動バックアップがないため、**設定 → 全データのバックアップ（JSON）** と Excel 出力を定期的に保存してください（有料プランでは日次バックアップあり）。
- 無料プランのプロジェクトは1週間アクセスがないと一時停止されます。ダッシュボードから再開できます（データは保持されます）。
- 領収書・レシートは資料整理のための機能です。税務上の経費判定や会計処理は行いません。

## トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| 「初期設定が必要です」と表示される | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` が未設定です |
| AI解析で「設定されていません」 | `ANTHROPIC_API_KEY` を設定して再デプロイしてください |
| AI解析で「APIキーが無効」 | キーの再発行、または Console の Billing 残高を確認してください |
| 確認メールのリンクでエラー | Supabase の Redirect URLs に `/auth/callback` が登録されているか確認してください |
| 画像が表示されない | マイグレーションの Storage 部分が実行されているか（バケット `item-files` が存在するか）確認してください |
