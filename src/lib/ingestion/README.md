# データ取得レイヤー（ingestion）

このアプリのデータフローは次のようになっている。

```
物件データ（外部サイト・手入力など）        公的データ（国土交通省 不動産情報ライブラリ）
        ↓                                        ↓
データ取得レイヤー（このディレクトリ）    エンリッチメント層（src/lib/publicData/）
        ↓                                        ↓
データベース（Property / SimulationInput / NearbyAttraction / CompetitorListing / PublicDataSnapshot）
        ↓
民泊分析（src/lib/score.ts, src/lib/simulation.ts）
        ↓
検索画面・詳細画面
```

物件そのもの（賃貸情報）と、物件周辺の公的データ（地価・用途地域・駅利用者数・災害リスク）は
性質が異なるため別レイヤーとして分離している。前者は `src/lib/ingestion/`、後者は
`src/lib/publicData/` を参照。

## 構成

- `types.ts` — どのデータソースから来たデータも変換すべき正規化形式 `RawListingInput` と、
  その最低限のバリデーション `validateRawListing()`。緯度経度(`latitude`/`longitude`)を
  設定すると、`ingestProperty()`が自動的に`src/lib/publicData/`経由で公的データを取得する。
  `listingStatus`/`firstSeenAt`/`lastSeenAt`/`lastCheckedAt`を指定すると掲載状態の
  自動更新ロジックを上書きできる（管理画面・CSVインポートからの手動指定用）。
  `minpakuConsultationStatus`は「民泊利用について物件提供元から得た確認状況」
  （オーナー確認済み・相談可能／要確認／不可／未確認）を表す別フィールドで、
  `listingStatus`（掲載が生きているか）とは無関係。未指定の場合、新規作成時のみ
  UNKNOWNになり、既存物件の更新では現在の値を維持する（再取込で意図せず
  確認済み状態が消えないようにするため）。法的な民泊可否を断定するものではない。
- `ingestProperty.ts` — `RawListingInput` を受け取り、重複判定・公的データの取得・
  民泊適性スコアの計算・掲載状態の更新を行った上でDBに書き込む唯一の入り口。
- `duplicateDetection.ts` — 重複判定ロジック本体。`source + externalId` → `sourceUrl` →
  住所/物件名の類似度・座標近接によるあいまい一致、の優先順位で判定する
  （あいまい一致は自動統合せず `DuplicateCandidate` として記録するのみ）。
- `csv/` — CSVインポートのパイプライン（`parseCsv.ts`＝依存なしの最小CSVパーサー、
  `columnAliases.ts`＝英語/日本語の列名エイリアス表、`csvRowMapper.ts`＝1行分の
  バリデーション・変換、`importCsv.ts`＝全体のオーケストレーションと`ImportBatch`の記録）。
- `providers/registry.ts` — 物件データ提供元（Provider）のメタデータレジストリ。
  push型（CSV・管理画面での手動登録）／pull型（外部API、現状すべて未接続）を整理する。
  pull型ソースは`fetch`フィールドに取得関数の参照をあらかじめ登録してあり、`connected`を
  `true`にするだけで`runDailySearch.ts`の対象に加わる（`getConnectedPullProviders()`参照）。
- `runDailySearch.ts` — 日次自動探索の本体。接続済みpull型ソースを1つずつ
  `fetch()`→`ingestProperty()`→`reconcileListingStatus()`の順に処理し、結果を
  `SearchRun`/`SearchRunSource`に記録する。1ソースの失敗は他ソースに影響しない。
  `options.scheduledFor`を渡すと`SearchRun.scheduledFor`（`@unique`）に記録され、
  同じ日のスケジュール実行が二重に作られることをDBレベルで防ぐ（STEP3）。
- `runScheduledDailySearch.ts` — `/api/cron/daily-search`から呼ばれる、STEP3の判定本体。
  `DailySearchSchedule`（`src/lib/schedule/`）を読み、`isScheduledTimeNow()`で今が設定時刻か
  判定した上で`runDailySearch()`を呼ぶ。未設定・OFF・時刻不一致・本日分実行済み、のいずれも
  エラーではなく理由付きのスキップとして扱う。
- `sources/manual.ts` — 開発・テスト用のダミーデータ。`RawListingInput[]` の形で返す。
  `prisma/seed.ts` から呼び出されている。
- `sources/homes.ts` — **【未接続】** LIFULL HOME'S API用のスタブ。正式な利用許諾契約が
  締結されるまでは呼び出されない（呼び出すと例外を投げる）。
- `sources/akiyabank.ts` — **【未接続】** 広島県「みんと。」・各市空き家バンク用のスタブ。
  利用規約上の二次利用禁止があるため、自治体からの正式なデータ提供が得られるまでは
  呼び出されない（呼び出すと例外を投げる）。

## 管理画面（/admin）からの実データ投入

`/admin/properties/new`（1件ずつの手動登録）と `/admin/import`（CSV一括登録・更新）から、
合法的に入手した実物件データを投入できる。どちらも内部的には`ingestProperty()`を通るため、
検索・スコアリング・収益シミュレーション・お気に入りは既存のダミーデータと同じように動作する。
詳しくはアプリのREADME「管理画面について」を参照。

## SUUMO・アットホーム（一般サイト）について

**意図的にアダプタ・スタブを用意していない。** 前回の調査で、SUUMOは利用規約で商業目的の
利用を明確に禁止しており、公式APIも存在しないことを確認済み。アットホームの一般サイトも
著作物の複製・転載を規約で禁止しており、ATBBは加盟不動産会社専用のクローズドシステムである。
無断スクレイピングは行わない方針のため、正式な提携・契約の見込みが立つまではスタブすら
作成しない（スタブの存在が「いずれ接続する前提」であるかのような誤解を避けるため）。

## 将来、新しいデータソースを追加する場合

`sources/` に新しいアダプタファイルを追加し、`RawListingInput[]`（または
`Promise<RawListingInput[]>`）を返す関数をエクスポートするだけでよい。`homes.ts` /
`akiyabank.ts` のスタブと同じ形を踏襲すれば、契約・許諾が得られた時点で
実装を差し替えるだけで済む。

呼び出し側（バッチスクリプトや `src/app/api/properties/ingest` のようなAPI）で
取得したデータを `ingestProperty()` に渡せば、DB・スコアリング・検索画面には
一切手を入れずに新しいデータソースを追加できる。

**注意**: SUUMO・HOME'S・アットホーム・空き家バンク等からの自動取得（スクレイピング等）は、
各サイトの利用規約・APIの利用条件の確認、または自治体・事業者との正式な合意が必要なため、
本プロジェクトでは意図的に未実装としている。
