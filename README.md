# 民泊物件サーチ（プロトタイプ）

民泊運営者向けに「この賃貸物件を借りて民泊をしたら儲かりそうか？」を判断しやすくするための物件検索アプリです。

現在は **広島県（広島市・廿日市市・呉市・東広島市）** のサンプルデータに対応しています。SUUMO等の外部サイトからの無断スクレイピングは行っておらず、代わりに管理画面からの手動登録・CSVインポートによって合法的に入手した実物件データを投入できる基盤を用意しています。

## 主な機能

- **物件検索**（スマホ最適化）: 地域・家賃上限・戸建て/マンション・間取り・専有面積・築年数・駅徒歩・駐車場・敷金・礼金で絞り込み。現在の検索条件をチップで一覧表示し、並び替え（民泊適性スコア順／想定利益順／家賃が安い順／新着順）にも対応
- **物件カード**: 写真枠・民泊適性スコア・想定月間利益を一目で確認できるデザイン
- **民泊適性スコア**: 家賃・専有面積・駅距離・駐車場・建物種別・築年数・周辺観光地・周辺競合民泊・地域の民泊規制レベル（仮の目安）に加え、**国土交通省「不動産情報ライブラリ」の公的データ（地価相場・用途地域・駅利用者数・災害リスク）**から算出する参考スコア。各要素の評価理由を表示（`src/lib/score.ts`）
- **物件詳細 + 民泊分析**: 物件情報に加え、スコアの内訳・理由、周辺観光地一覧、競合状況を表示
- **収益シミュレーション**: 家賃・宿泊単価・稼働率・水道光熱費・清掃費・消耗品費・OTA手数料率・その他経費をその場で自由に編集し、月間売上・月間利益・年間利益・想定利回り・投資回収期間をリアルタイム再計算（`src/lib/simulation.ts`）
- **お気に入り**: 登録/解除、一覧でスコア・想定利益（月/年）・掲載状況を比較
- **掲載状態管理**: 物件ごとに「掲載中／掲載終了／確認できません」を管理。検索結果は掲載終了の物件を除外し、詳細画面には「最終確認：◯時間前」を表示。お気に入り済みの物件が掲載終了しても一覧で確認できる（`src/lib/ingestion/reconcileListingStatus.ts` で将来の自動照合に対応できる構造）
- **民泊利用についての確認状況**: 「オーナー確認済み・相談可能／オーナー確認が必要／民泊不可／未確認」の4区分を物件ごとに管理し、詳細画面にバッジで表示。**掲載状態（上記）とは別の情報**で、あくまで物件提供元から得た確認状況の参考情報であり、「民泊可能」と法的に断定するものではない
- **管理画面（実物件データの投入基盤）**: `/admin` から物件の手動登録・CSV一括インポート・重複候補の確認・データ品質の把握ができる（詳しくは下記「管理画面について」）
- **保存検索条件・新着通知**: 気になる検索条件を名前を付けて保存し、ON/OFF切り替え・編集・削除ができる。新しく登録された物件（既存物件の更新は対象外）が保存条件に一致すると通知が生成され、`/notifications`で確認・クリックで物件詳細へ移動できる（詳しくは下記「保存検索条件と新着通知について」）

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

## テスト

```bash
npm run test         # 回帰テスト一式（tests/配下）を一度だけ実行
npm run test:watch   # ウォッチモード
npm run lint
npx tsc --noEmit
```

`npm run test` は開発用の`dev.db`とは別に、専用のテストDB（`prisma/test.db`。gitignore済み）を
実行のたびに作り直して使う。`ingestProperty()`・重複判定・保存検索条件とのマッチング（民泊相談状況・
最低期待利益の条件含む）・メール通知（`EMAIL_PROVIDER=fake`のFakeアダプタ経由）・
掲載状態の自動照合・日次自動探索・探索スケジュール設定の主要ロジックを、実際のPrisma+SQLiteに
対して検証する（外部ネットワーク呼び出しは行わない。`REINFOLIB_API_KEY`未設定時は公的データ取得が
即座にスキップされる仕様を利用している）。過去のPlaywrightによる実機確認（`/tmp`配下の
使い捨てスクリプト）とは別物で、こちらはリポジトリにコミットされ再現可能。

## データフローの構造（外部データ取込に備えた設計）

```
物件データ（外部サイト・手入力など）        公的データ（国土交通省 不動産情報ライブラリ）
        ↓                                        ↓
データ取得レイヤー（src/lib/ingestion）    エンリッチメント層（src/lib/publicData）
        ↓                                        ↓
データベース（Property / SimulationInput / NearbyAttraction / CompetitorListing / PublicDataSnapshot）
        ↓
民泊分析（src/lib/score.ts, src/lib/simulation.ts）
        ↓
検索画面・詳細画面
```

- `src/lib/ingestion/types.ts` — 外部データソースが満たすべき正規化形式 `RawListingInput`（緯度経度を設定すると公的データ取得が有効化される）
- `src/lib/ingestion/ingestProperty.ts` — 公的データ取得・スコア計算・掲載状態の更新込みでDBに反映する唯一の入り口
- `src/lib/ingestion/duplicateDetection.ts` — 重複判定ロジック（`source+externalId` → `sourceUrl` → 住所/物件名の類似度・座標近接によるあいまい一致の順）。あいまい一致は自動統合せず`DuplicateCandidate`として記録
- `src/lib/ingestion/csv/` — CSVインポートのパイプライン（パース・列名エイリアス・行バリデーション・取込オーケストレーション）
- `src/lib/ingestion/providers/registry.ts` — 物件データ提供元のメタデータレジストリ（push型/pull型、接続可否）
- `src/lib/ingestion/reconcileListingStatus.ts` — 掲載状態の自動照合処理の骨組み（**未接続**。外部データ再取得のバッチが実装された際に呼び出す想定）
- `src/lib/ingestion/sources/manual.ts` — 現時点で唯一実装済みのデータソース（手入力の広島県サンプルデータ、緯度経度は手動設定）
- `src/lib/ingestion/sources/homes.ts` / `akiyabank.ts` — **【未接続】** LIFULL HOME'S API・空き家バンク向けスタブ（正式契約・許諾が得られるまで呼び出されない）
- `src/lib/publicData/` — 国土交通省「不動産情報ライブラリ」から地価相場・用途地域・駅利用者数・災害リスクを取得するエンリッチメント層。`REINFOLIB_API_KEY`未設定時や通信エラー時は例外を投げず、公的データを「取得できませんでした」として扱う（詳しくは下記「公的データについて」）
- `src/app/api/properties/ingest/route.ts` — 将来の外部データ取込用API（`INGEST_API_TOKEN`未設定時は無効化）

詳しくは [`src/lib/ingestion/README.md`](src/lib/ingestion/README.md) を参照してください。

**注意**: SUUMO・HOME'S・アットホーム・空き家バンク等からの自動取得（スクレイピング等）は、各サイトの利用規約・APIの利用条件の確認、または自治体・事業者との正式な合意が必要なため、本プロジェクトでは意図的に未実装としています。

## 公的データについて（国土交通省 不動産情報ライブラリ）

物件の緯度経度が設定されている場合、[不動産情報ライブラリAPI](https://www.reinfolib.mlit.go.jp/api/request/)から以下を取得し、民泊適性スコアの参考情報として利用します。

- 地価・取引価格相場（同一市区町村の直近データ）
- 用途地域
- 最寄駅の乗降客数
- 洪水・津波・土砂災害・高潮の各想定区域への該当有無

利用には`REINFOLIB_API_KEY`環境変数の設定が必要です（`.env.example`参照、個人利用は無料で申請可能）。**未設定でもアプリは正常に動作し**、該当項目は中立点として扱われ、「公的データを取得できませんでした」という理由が表示されます。通信エラー・タイムアウト・対象地域のデータなし等が発生した場合も同様にフォールバックし、アプリ全体が落ちることはありません。

⚠️ これらの公的データは、あくまで「物件周辺の環境・立地・リスクを評価するための参考データ」であり、民泊営業の可否や安全性を保証・確定するものではありません（`src/lib/publicData/types.ts` の `PUBLIC_DATA_DISCLAIMER`）。

## 管理画面について（実物件データの投入基盤）

`/admin` 以下に、実際の物件データを合法的な方法で投入するための管理画面があります。**認証は未実装**のため、トップページのナビゲーションには表示しておらず、URLを直接開いた場合のみアクセスできます（本番運用前に必ずアクセス制御を追加してください）。

- `/admin` — ダッシュボード（登録物件数・掲載状況の内訳・データ取得元別件数・重複候補数・直近のCSV取込結果）
- `/admin/properties/new` — 物件を1件ずつ手動登録するフォーム
- `/admin/import` — CSVファイルからの一括登録・更新（列名は英語・日本語どちらでも認識）
- `/admin/duplicates` — 自動では統合されなかった重複候補の一覧（物件名・住所の類似度や座標の近接度から検出）

CSVを再インポートすると、`source + externalId`（無ければ同一の元サイトURL）が一致する既存物件は新規登録ではなく更新されます（家賃変更の反映、`listingStatus`を`ENDED`にする掲載終了処理など）。数値・緯度経度・必須項目・URL形式などの不正なデータは行番号付きでエラー表示され、DBには反映されません。

CSVの「民泊相談可否」列（「民泊利用確認状況」「オーナー確認状況」「民泊確認状況」等の日本語列名にも対応）には「オーナー確認済み・相談可能／オーナー確認が必要／民泊不可／未確認」のいずれかを入力してください。この4区分以外の値はエラーになります。列自体を省略した場合、新規物件はUNKNOWN（未確認）扱いになり、既存物件の更新では既存の値がそのまま維持されます（再取込のたびに確認済み状態が消えることはありません）。

データ取得元は `src/lib/ingestion/providers/registry.ts` でメタデータ管理しており、将来LIFULL HOME'S API・空き家バンク等と正式に連携する際もこの構造に沿って追加できます（現状はいずれも未接続）。

## 保存検索条件と新着通知について

`/saved-searches` から、地域・家賃上限・建物種別・専有面積下限・築年数上限・駅徒歩上限・駐車場の条件に名前を付けて保存できます。この条件は検索画面(`SearchFilters`)と同じ判定ロジック(`src/lib/propertyQuery.ts`)を共有しており、検索結果と保存条件の判定が食い違うことはありません。物件検索画面の「🔔 この条件を保存して新着通知を受け取る」リンクから、現在の絞り込み条件を引き継いで保存することもできます。

保存検索条件には、地域等に加えて**民泊利用についての確認状況**（`Property`と同じ4区分。指定しない場合は状況によらず対象）と、**最低期待月間利益**（指定した場合、`calculateSimulation()`で算出した想定月間利益がこの金額以上の物件のみ対象。DBのwhere句ではなくアプリケーション側で判定）も設定できます。

新しい物件が**新規登録**されたとき（`ingestProperty()`が`created: true`を返したとき）だけ、有効な保存検索条件と自動的に照合されます。既存物件の家賃変更などの**更新**では通知は生成されません。一致した場合は`PropertyMatch`レコードが作成され、`/notifications`の通知一覧に表示されます。同じ物件×同じ保存検索条件の組み合わせは`@@unique`制約により二重に生成されません。

### メール通知（STEP8）

`PropertyMatch`が作成されると、`src/lib/notifications/notifyPropertyMatch.ts`がメール通知を試みます。本文には物件名・所在地・家賃・面積・民泊利用についての確認状況・想定月間利益・民泊適性スコア・物件詳細ページへのリンクを含みます（`src/lib/notifications/email/buildMatchEmail.ts`）。

実際の送信は`EmailAdapter`インターフェース（`src/lib/notifications/email/types.ts`）越しに行い、`EMAIL_PROVIDER`環境変数で切り替えます。

- 未設定（既定）: 送信自体を行いません。外部メールサービスを契約・設定していない状態でも安全に動作します。
- `console`: ローカル開発用。実際には送信せず、内容をコンソールに出力します。
- `fake`: テスト専用（`tests/`からのみ使用。本番では設定しないでください）。

送信の成否は`console.info`/`console.warn`でログに出力されます。メール送信が失敗しても（またはアダプタ・送信先が未設定でも）例外は投げず、`PropertyMatch`の作成・物件の取込自体には一切影響しません。将来Push通知等を追加する場合は、`notifyPropertyMatch.ts`にチャネルを1つ追加するだけで済む構造にしています。将来Resend等の実サービスを導入する場合も、`EmailAdapter`を実装した新しいクラスを追加し`EMAIL_PROVIDER`の分岐を増やすだけで、呼び出し側は変更不要です。

⚠️ 認証機能は未実装のため、保存検索条件・通知（メール宛先含む）は「単一ユーザー」前提です（`userId`は固定値`"default-user"`、メール宛先は`NOTIFICATION_EMAIL_TO`環境変数で固定）。将来ログイン機能を追加する際、これらの値を実ユーザーの情報に差し替えるだけで移行できます。

## 日次自動探索（自動巡回エージェントの土台）

`POST`/`GET /api/cron/daily-search` を叩くと、`src/lib/ingestion/runScheduledDailySearch.ts` が
「今が`/settings`で設定した探索時刻かどうか」を判定し（後述）、該当すれば
`src/lib/ingestion/runDailySearch.ts`が「`src/lib/ingestion/providers/registry.ts`の
`PROVIDER_REGISTRY`のうち`connected:true`かつ`kind:"pull"`のソース」を1つずつ呼び出し、
取得した物件を`ingestProperty()`で取込→`reconcileListingStatus()`で掲載状態を照合、まで
自動で行います。結果は`SearchRun`（1回の実行全体）・`SearchRunSource`（ソースごとの内訳）
としてDBに記録され、実行開始/終了時刻・成功/失敗ソース数・取得件数・新着件数・通知
（`PropertyMatch`）生成件数を後から確認できます。

**現時点では`homes`/`akiyabank`とも`connected:false`のため、対象ソースは0件です。**
探索時刻になってこのAPIが実行されても`sourceCount:0`・`status:"COMPLETED"`のSearchRunが
記録されるだけで、実際のデータ取得は行われません（LIFULL HOME'S API・空き家バンク等との
正式なデータ提供合意が得られ次第、該当ソースの`sources/*.ts`を実装し、レジストリの
`connected`を`true`にすることで対象に加わります。呼び出し側のコードは変更不要）。

このAPIは`CRON_API_TOKEN`環境変数が未設定の場合は常に501を返し無効化されます（`/api/properties/ingest`
と同じ安全側デフォルト）。設定されている場合、ヘッダー`x-cron-token`の値が一致しなければ401を返します
（STEP1から挙動は変えていません）。

### 探索時刻の設定と自動実行（STEP9・STEP3）

`/settings`から「自動探索 ON/OFF」「探索時刻（HH:mm）」を設定できます（`DailySearchSchedule`テーブル、
`src/lib/schedule/`）。認証機能は未実装のため単一ユーザー（`userId`固定値`"default-user"`）前提ですが、
`userId`に`@@unique`を張ってあるだけなので、将来ユーザーごとに複数行を持てるよう拡張しやすい構造に
しています。タイムゾーンは値として保持しているものの（既定`Asia/Tokyo`）、UIでの変更は現時点では
提供していません。

`/api/cron/daily-search`が叩かれると、`src/lib/ingestion/runScheduledDailySearch.ts`が
`DailySearchSchedule`を読み、`isScheduledTimeNow()`（`src/lib/schedule/scheduleTime.ts`。
サーバーのタイムゾーンに依存せず、常に`schedule.timezone`基準で判定する）で「今が設定時刻かどうか」を
判定します。一致すればそのときだけ`runDailySearch()`を実行し、一致しなければ何もせず200を返します
（スケジュール未設定・OFF・時刻不一致・本日分は実行済み、のいずれも**エラーではなく正常なスキップ**として
扱い、理由（`NO_SCHEDULE`/`DISABLED`/`NOT_SCHEDULED_TIME`/`ALREADY_RAN_TODAY`）をレスポンスと
サーバーログの両方に残します。これらのケースではSearchRunは作成しません）。

**二重実行防止はDBレベルで行っています。** `SearchRun.scheduledFor`（`DailySearchSchedule.timezone`基準の
"YYYY-MM-DD"）に`@unique`制約を付けており、スケジュール実行時の`SearchRun`作成自体がこの制約で
守られます。「先に確認してから作成する」方式ではなく「作成そのものが一意性を強制する」方式のため、
外部スケジューラから複数リクエストがほぼ同時に来ても競合状態(race condition)なく二重実行を防げます
（手動実行等、`scheduledFor`を指定しない`SearchRun`はこの制約の対象外＝何件あっても衝突しません）。

外部スケジューラは、Vercel Cron・GitHub Actionsのscheduled workflow・自前サーバーのOS cron等、
デプロイ先に応じて選定し、`/api/cron/daily-search`を毎分〜数分間隔で（ヘッダー`x-cron-token`に
`CRON_API_TOKEN`と同じ値を付けて）呼び出す運用を想定しています。**現時点でこのアプリの実際の
デプロイ先は未確定のため（リポジトリに`vercel.json`等の設定が存在しない）、特定サービスの契約・課金は
行っていません。** 具体的な選択肢:

- **Vercel Cron**（すでにVercelへデプロイ済み・デプロイ予定の場合の第一候補）: Hobbyプランは
  cronジョブが1日1回までに制限されるため、本アプリのように「ユーザーが任意の時刻を設定でき、
  数分間隔でポーリングして判定する」設計とは相性がよくありません。分単位の頻度で実行するには
  Proプラン以上が必要です。
- **GitHub Actions**（`.github/workflows/daily-search-cron.yml`）: デプロイ先を問わず使える、
  追加課金不要の代替案としてワークフローを用意済みです。`schedule`トリガーは動作確認が済むまで
  コメントアウトしてあり、有効化するには`APP_URL`・`CRON_API_TOKEN`をリポジトリのSecretsに設定した
  上でコメントを外してください。GitHub Actionsのscheduled workflowは公式に5分未満の間隔を
  設定できず、実際の発火はサーバー負荷により数分遅延することがある点に注意してください
  （`workflow_dispatch`での手動実行にも対応しているため、設定確認にはそちらが使えます）。

デバッグ用に、認証済みリクエスト（`x-cron-token`が正しい場合のみ）に限り、ヘッダー
`x-cron-simulate-now`（ISO8601日時）で「現在時刻」を指定して動作確認できます。

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
    admin/                       # 管理画面（手動登録・CSVインポート・重複候補・ダッシュボード）
    saved-searches/              # 保存検索条件の一覧・作成・編集
    notifications/                # 新着物件の通知一覧
  components/                   # UI コンポーネント
  lib/
    ingestion/       # データ取得レイヤー（外部データ取込の構造。csv/・providers/含む）
    notifications/   # 新着物件と保存検索条件の照合ロジック
    propertyQuery.ts  # 検索画面・保存検索条件マッチングが共有するwhere条件生成ロジック
    publicData/      # 不動産情報ライブラリからの公的データ取得（エンリッチメント層）
    score.ts         # 民泊適性スコアの計算ロジック
    simulation.ts    # 収益シミュレーションの計算ロジック
    regions.ts        # 対応エリア・民泊規制レベル・市区町村コードの設定
    propertySimulation.ts # 保存済み初期値からの収益計算ヘルパー
    prisma.ts         # Prisma Client（シングルトン）
```

## 今後の拡張予定（未実装）

- 管理画面への認証・アクセス制御の追加（現状は未実装）
- LIFULL HOME'S APIとの正式契約、広島県「みんと。」・各市空き家バンクとのデータ連携（スタブのみ用意済み）
- SUUMO・アットホーム（一般サイト）は利用規約上、無断取得を行わない方針（詳細は`src/lib/ingestion/README.md`）
- 新着物件のPush通知の実送信（メール通知は実装済み。`src/lib/notifications/notifyPropertyMatch.ts`参照）
- 実際のメールサービス（Resend等）の契約・導入（現状は`EMAIL_PROVIDER`未設定時は送信スキップ、`console`はログ出力のみ）
- ログイン機能（保存検索条件・通知の複数ユーザー対応。メール宛先も現状は単一の環境変数固定）
- 外部スケジューラの実際の有効化（`isScheduledTimeNow()`との接続自体は完了済み。`.github/workflows/daily-search-cron.yml`の`schedule`トリガー有効化、またはVercel Cron等の設定はデプロイ先未確定のため未実施）
- 複数ユーザーごとに異なる探索時刻・タイムゾーンを持てるようにする（`DailySearchSchedule`は構造上対応済みだが、UIでのタイムゾーン変更は現状未提供）
- 周辺観光地・競合民泊の実データ化（不動産情報ライブラリには該当データがないため別ソースが必要）
- 住宅宿泊事業法の180日制限、自治体ごとの民泊規制、旅館業許可の可能性確認（実データに基づく判定）
- AI による物件評価・民泊適性の高度な判定
- 緯度経度の自動ジオコーディング（現状は手動設定）
- 全国エリアへの拡張
