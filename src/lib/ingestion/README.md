# データ取得レイヤー（ingestion）

このアプリのデータフローは次のようになっている。

```
物件データ（外部サイト・手入力など）
        ↓
データ取得レイヤー（このディレクトリ）
        ↓
データベース（Property / SimulationInput / NearbyAttraction / CompetitorListing）
        ↓
民泊分析（src/lib/score.ts, src/lib/simulation.ts）
        ↓
検索画面・詳細画面
```

## 構成

- `types.ts` — どのデータソースから来たデータも変換すべき正規化形式 `RawListingInput` と、
  その最低限のバリデーション `validateRawListing()`。
- `ingestProperty.ts` — `RawListingInput` を受け取り、民泊適性スコアを計算した上で
  DBに書き込む唯一の入り口。`source` + `sourceId` が一致する既存物件があれば更新、
  なければ新規作成する（再取得時の重複防止）。
- `sources/manual.ts` — 現時点で唯一実装済みのデータソース。手入力のダミーデータを
  `RawListingInput[]` の形で返す。`prisma/seed.ts` から呼び出されている。

## 将来、実サイトからのデータ取得を追加する場合

`sources/` に新しいアダプタファイルを追加し、`RawListingInput[]`（または
`Promise<RawListingInput[]>`）を返す関数をエクスポートするだけでよい。

```ts
// src/lib/ingestion/sources/suumo.ts （※未実装。あくまで将来追加する場合の例）
export async function fetchSuumoListings(): Promise<RawListingInput[]> {
  // SUUMOの利用規約・APIの利用条件を確認した上で実装する
}
```

呼び出し側（バッチスクリプトや `src/app/api/properties/ingest` のようなAPI）で
取得したデータを `ingestProperty()` に渡せば、DB・スコアリング・検索画面には
一切手を入れずに新しいデータソースを追加できる。

**注意**: SUUMO・HOME'S・アットホーム等からの自動取得（スクレイピング等）は、
各サイトの利用規約・APIの利用条件の確認が必要なため、本プロジェクトでは
意図的に未実装としている。
