-- =====================================================================
-- MIYAJIMA STOCK 初期スキーマ（新規データベースへの初回適用用）
--
-- ・Supabase の SQL Editor に全文を貼り付けて 1 回実行すれば初期設定が完了します。
-- ・全体を 1 つのトランザクション（begin 〜 commit）で実行するため、途中で
--   エラーが発生した場合はすべて取り消され、不完全な状態は残りません。
-- ・金額はすべて日本円の整数（bigint）で保存します。
-- ・すべてのテーブルは Row Level Security で「本人のデータのみ」に制限します。
-- ・SECURITY DEFINER 関数は search_path を空に固定し、参照はすべてスキーマ名付きです。
-- =====================================================================

begin;

-- gen_random_uuid() は PostgreSQL 標準関数のため拡張機能は不要です。

-- ---------------------------------------------------------------------
-- 購入ステータス
--   considering(検討中) / planned(未購入)               → 未購入予定として集計
--   ordered(注文済み) / shipping(配送中) /
--   purchased(購入済み) / installed(設置完了)            → 購入確定として集計
--   cancelled(購入取り消し)                              → 集計対象外
-- ---------------------------------------------------------------------
do $$ begin
  create type public.item_status as enum (
    'considering', 'planned', 'ordered', 'shipping', 'purchased', 'installed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- テーブル
-- =====================================================================

-- ユーザー設定（予算など）
create table if not exists public.user_settings (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  total_budget bigint not null default 3800000 check (total_budget >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- カテゴリー（タグ）
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null default '#1f4d3a',
  icon        text not null default 'tag',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists categories_user_idx on public.categories(user_id, sort_order);

-- 商品
create table if not exists public.items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 200),
  original_name      text,
  item_type          text,
  brand              text,
  model_number       text,
  color              text,
  size               text,
  description        text,
  store              text,             -- 販売サイト（Amazon / 楽天市場 / ニトリ など）
  url                text,
  planned_unit_price bigint check (planned_unit_price is null or planned_unit_price >= 0),
  actual_unit_price  bigint check (actual_unit_price is null or actual_unit_price >= 0),
  quantity           integer not null default 1 check (quantity >= 1),
  shipping_fee       bigint not null default 0 check (shipping_fee >= 0),
  status             public.item_status not null default 'planned',
  purchase_date      date,
  purchase_store     text,             -- 実際の購入先
  notes              text,
  image_path         text,             -- Storage: 商品画像
  screenshot_path    text,             -- Storage: 元スクリーンショット
  screenshot_hash    text,             -- 重複検出用 SHA-256
  ai_extracted       jsonb,            -- AIが抽出した元データ（参考保存）
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists items_user_created_idx on public.items(user_id, created_at desc);
create index if not exists items_user_status_idx  on public.items(user_id, status);
create index if not exists items_user_hash_idx    on public.items(user_id, screenshot_hash);

-- 商品 × カテゴリー（多対多）。カテゴリーを削除しても商品は残ります。
create table if not exists public.item_categories (
  item_id     uuid not null references public.items(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (item_id, category_id)
);
create index if not exists item_categories_category_idx on public.item_categories(category_id);
create index if not exists item_categories_user_idx on public.item_categories(user_id);

-- 購入履歴・価格変更履歴（トリガー経由でのみ追加。利用者は閲覧のみ）
create table if not exists public.item_events (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null check (event_type in (
    'created', 'status_changed', 'planned_price_changed', 'actual_price_changed', 'quantity_changed'
  )),
  from_value  text,
  to_value    text,
  created_at  timestamptz not null default now()
);
create index if not exists item_events_item_idx on public.item_events(item_id, created_at desc);
create index if not exists item_events_user_idx on public.item_events(user_id);

-- その他費用（内装工事費・電気工事費・消防設備費・契約費など）
create table if not exists public.other_expenses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 200),
  expense_type      text not null default 'その他',
  estimated_amount  bigint check (estimated_amount is null or estimated_amount >= 0),
  actual_amount     bigint check (actual_amount is null or actual_amount >= 0),
  is_confirmed      boolean not null default false, -- true = 実績確定 / false = 見積
  expense_date      date,
  vendor            text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists other_expenses_user_idx on public.other_expenses(user_id, created_at desc);

-- 領収書・レシート（商品 または その他費用 の「どちらか一方だけ」に紐付け）
create table if not exists public.receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id       uuid references public.items(id) on delete cascade,
  expense_id    uuid references public.other_expenses(id) on delete cascade,
  file_path     text not null check (char_length(file_path) between 1 and 500),
  file_name     text,
  purchase_date date,
  store         text,
  amount        bigint check (amount is null or amount >= 0),
  notes         text,
  created_at    timestamptz not null default now(),
  constraint receipts_exactly_one_parent check (num_nonnulls(item_id, expense_id) = 1)
);
create index if not exists receipts_item_idx on public.receipts(item_id);
create index if not exists receipts_expense_idx on public.receipts(expense_id);
create index if not exists receipts_user_idx on public.receipts(user_id);

-- =====================================================================
-- 関数（すべて search_path を空に固定）
-- =====================================================================

-- updated_at 自動更新（呼び出し元の権限で実行）
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end $$;

-- user_id の変更を禁止（作成後に別ユーザーへ付け替えられないようにする）
create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id は変更できません'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- 購入履歴の自動記録（item_events への書き込みはこの関数経由のみ）
create or replace function public.log_item_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.item_events(item_id, user_id, event_type, to_value)
    values (new.id, new.user_id, 'created', new.status::text);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.item_events(item_id, user_id, event_type, from_value, to_value)
    values (new.id, new.user_id, 'status_changed', old.status::text, new.status::text);
  end if;
  if new.planned_unit_price is distinct from old.planned_unit_price then
    insert into public.item_events(item_id, user_id, event_type, from_value, to_value)
    values (new.id, new.user_id, 'planned_price_changed', old.planned_unit_price::text, new.planned_unit_price::text);
  end if;
  if new.actual_unit_price is distinct from old.actual_unit_price then
    insert into public.item_events(item_id, user_id, event_type, from_value, to_value)
    values (new.id, new.user_id, 'actual_price_changed', old.actual_unit_price::text, new.actual_unit_price::text);
  end if;
  if new.quantity is distinct from old.quantity then
    insert into public.item_events(item_id, user_id, event_type, from_value, to_value)
    values (new.id, new.user_id, 'quantity_changed', old.quantity::text, new.quantity::text);
  end if;
  return new;
end $$;

-- 商品とカテゴリーの紐付けは、両方とも同じ利用者のものに限る
create or replace function public.check_item_category_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.items i where i.id = new.item_id and i.user_id = new.user_id)
     or not exists (select 1 from public.categories c where c.id = new.category_id and c.user_id = new.user_id) then
    raise exception 'item/category owner mismatch' using errcode = '42501';
  end if;
  return new;
end $$;

-- 領収書の紐付け先は同じ利用者の商品・費用に限る
create or replace function public.check_receipt_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.item_id is not null and not exists (
    select 1 from public.items i where i.id = new.item_id and i.user_id = new.user_id) then
    raise exception 'receipt item owner mismatch' using errcode = '42501';
  end if;
  if new.expense_id is not null and not exists (
    select 1 from public.other_expenses e where e.id = new.expense_id and e.user_id = new.user_id) then
    raise exception 'receipt expense owner mismatch' using errcode = '42501';
  end if;
  return new;
end $$;

-- 初期設定と初期カテゴリーの作成（内部用。利用者は直接呼び出せない）
create or replace function public.seed_user_defaults(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings(user_id) values (p_user) on conflict do nothing;
  insert into public.categories(user_id, name, color, icon, sort_order) values
    (p_user, '和室',     '#1f4d3a', 'sofa',          10),
    (p_user, '洋室',     '#3d6b57', 'bed-double',    20),
    (p_user, 'リビング', '#6b8f71', 'armchair',      30),
    (p_user, 'キッチン', '#b08d57', 'cooking-pot',   40),
    (p_user, '浴室',     '#4a7c8c', 'bath',          50),
    (p_user, 'トイレ',   '#7a9aa8', 'droplets',      60),
    (p_user, '玄関',     '#8c6e4a', 'door-open',     70),
    (p_user, '廊下',     '#a3a08c', 'footprints',    80),
    (p_user, '家電',     '#3b4a5c', 'plug',          90),
    (p_user, '消防設備', '#a8423a', 'flame',        100),
    (p_user, '清掃用品', '#5c8a8a', 'spray-can',    110),
    (p_user, '消耗品',   '#9c7a3c', 'package',      120),
    (p_user, 'その他',   '#6b6b6b', 'tag',          130)
  on conflict (user_id, name) do nothing;
end $$;

-- 新規ユーザー作成時（auth.users への追加時）に初期データを作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end $$;

-- ログイン中の本人の初期データを（未作成の場合のみ）作成。アプリから RPC で呼び出す
create or replace function public.ensure_my_defaults()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.user_settings(user_id) values (v_uid) on conflict do nothing;
  if not exists (select 1 from public.categories where user_id = v_uid) then
    perform public.seed_user_defaults(v_uid);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 関数の実行権限
--   Supabase は public スキーマの新しい関数に anon / authenticated の実行権限を
--   自動付与するため、PUBLIC だけでなく両ロールからも明示的に取り消します。
--   アプリから呼び出すのは ensure_my_defaults() のみ（authenticated に限定）。
--   トリガー関数はトリガーとしてのみ動作し、実行権限は不要です。
-- ---------------------------------------------------------------------
revoke all on function public.set_updated_at()            from public, anon, authenticated;
revoke all on function public.prevent_user_id_change()    from public, anon, authenticated;
revoke all on function public.log_item_events()           from public, anon, authenticated;
revoke all on function public.check_item_category_owner() from public, anon, authenticated;
revoke all on function public.check_receipt_owner()       from public, anon, authenticated;
revoke all on function public.seed_user_defaults(uuid)    from public, anon, authenticated;
revoke all on function public.handle_new_user()           from public, anon, authenticated;
revoke all on function public.ensure_my_defaults()        from public, anon, authenticated;
grant execute on function public.ensure_my_defaults() to authenticated;

-- =====================================================================
-- トリガー
-- =====================================================================

-- updated_at
drop trigger if exists trg_items_updated on public.items;
create trigger trg_items_updated before update on public.items
  for each row execute function public.set_updated_at();
drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
drop trigger if exists trg_expenses_updated on public.other_expenses;
create trigger trg_expenses_updated before update on public.other_expenses
  for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.user_settings;
create trigger trg_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

-- user_id の変更禁止（user_id を持つ全テーブル）
do $$
declare t text;
begin
  foreach t in array array['user_settings','categories','items','item_categories','item_events','other_expenses','receipts'] loop
    execute format('drop trigger if exists trg_%s_user_id_immutable on public.%I', t, t);
    execute format(
      'create trigger trg_%s_user_id_immutable before update of user_id on public.%I
         for each row execute function public.prevent_user_id_change()', t, t);
  end loop;
end $$;

-- 購入履歴の自動記録
drop trigger if exists trg_items_events on public.items;
create trigger trg_items_events after insert or update on public.items
  for each row execute function public.log_item_events();

-- 紐付けの所有者チェック
drop trigger if exists trg_item_categories_owner on public.item_categories;
create trigger trg_item_categories_owner before insert or update on public.item_categories
  for each row execute function public.check_item_category_owner();
drop trigger if exists trg_receipts_owner on public.receipts;
create trigger trg_receipts_owner before insert or update on public.receipts
  for each row execute function public.check_receipt_owner();

-- 新規ユーザー作成時の初期データ
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- テーブル権限と Row Level Security
--   ・anon（未ログイン）にはテーブル権限を一切与えません。
--   ・authenticated には必要な操作のみ許可し、RLS で本人の行に限定します。
--   ・item_events は閲覧のみ（INSERT / UPDATE / DELETE 権限なし）。
-- =====================================================================
revoke all on table
  public.user_settings, public.categories, public.items, public.item_categories,
  public.item_events, public.other_expenses, public.receipts
  from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.user_settings, public.categories, public.items, public.item_categories,
  public.other_expenses, public.receipts
  to authenticated;
grant select on table public.item_events to authenticated;

alter table public.user_settings   enable row level security;
alter table public.categories      enable row level security;
alter table public.items           enable row level security;
alter table public.item_categories enable row level security;
alter table public.item_events     enable row level security;
alter table public.other_expenses  enable row level security;
alter table public.receipts        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['user_settings','categories','items','item_categories','other_expenses','receipts'] loop
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "own_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- 履歴は閲覧のみ（書き込み用のポリシーは作成しない）
drop policy if exists "own_select" on public.item_events;
create policy "own_select" on public.item_events for select to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- Storage: 非公開バケット（パスの先頭フォルダ = ユーザーID）
--   ・閲覧は署名付き URL（本人のみ発行可能）
--   ・アップロード・削除は本人のフォルダのみ
--   ・更新（上書き・移動）はアプリで使用しないため許可しない
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-files', 'item-files', false, 15728640,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "item_files_select_own" on storage.objects;
drop policy if exists "item_files_insert_own" on storage.objects;
drop policy if exists "item_files_update_own" on storage.objects;
drop policy if exists "item_files_delete_own" on storage.objects;

create policy "item_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'item-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "item_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "item_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'item-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- Realtime（iPhone と Mac の画面を自動同期）
--   変更通知は RLS に従い、本人の行の変更のみ受信します。
--   item_events は商品の変更に合わせてアプリ側で再取得するため対象外です。
-- =====================================================================
do $$
declare t text;
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['items','categories','item_categories','other_expenses','receipts','user_settings'] loop
      if not exists (
        select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

commit;
