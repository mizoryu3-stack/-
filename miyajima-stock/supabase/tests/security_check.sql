-- 権限・整合性テスト（ローカル Supabase 専用。本番では実行しないこと：テスト用ユーザーを作成します）
--   npx supabase db reset
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tA -f supabase/tests/security_check.sql
\set QUIET on
insert into auth.users(id, email, aud, role) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@test.local','authenticated','authenticated'),
 ('bbbbbbbb-0000-0000-0000-000000000002','b@test.local','authenticated','authenticated');
create temp table t_result(name text, ok boolean);
grant all on t_result to authenticated, anon;

create or replace function pg_temp.expect_error(p_name text, p_sql text) returns void language plpgsql as $f$
begin
  begin execute p_sql; insert into t_result values (p_name, false);
  exception when others then insert into t_result values (p_name || '  [' || sqlerrm || ']', true); end;
end $f$;
create or replace function pg_temp.expect_ok(p_name text, p_sql text) returns void language plpgsql as $f$
begin
  begin execute p_sql; insert into t_result values (p_name, true);
  exception when others then insert into t_result values (p_name || '  [' || sqlerrm || ']', false); end;
end $f$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- ===== ユーザーA =====
set role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', false);
select pg_temp.expect_ok('A: 初期カテゴリー13件・予算380万円が自動作成', $q$do $x$ begin
  if (select count(*) from public.categories) <> 13 or (select total_budget from public.user_settings) <> 3800000 then raise exception 'seed'; end if; end $x$ $q$);
select pg_temp.expect_ok('A: ensure_my_defaults() を実行できる', 'select public.ensure_my_defaults()');
select pg_temp.expect_ok('A: 商品を登録できる', $$insert into public.items(id,name,planned_unit_price) values ('11111111-0000-0000-0000-000000000001','ローテーブル',12800)$$);
select pg_temp.expect_ok('A: 自分の商品とカテゴリーを紐付けできる', $$insert into public.item_categories(item_id,category_id) select '11111111-0000-0000-0000-000000000001', id from public.categories where name='和室'$$);
select pg_temp.expect_ok('A: 購入済みに変更できる', $$update public.items set status='purchased', actual_unit_price=11800 where id='11111111-0000-0000-0000-000000000001'$$);
select pg_temp.expect_ok('A: トリガー経由で履歴が3件記録される', $q$do $x$ begin if (select count(*) from public.item_events) <> 3 then raise exception 'events=%',(select count(*) from public.item_events); end if; end $x$ $q$);
select pg_temp.expect_ok('A: updated_at が自動更新される', $q$do $x$ begin if (select updated_at = created_at from public.items limit 1) then raise exception 'not updated'; end if; end $x$ $q$);
select pg_temp.expect_error('A: item_events に直接 INSERT できない', $$insert into public.item_events(item_id,user_id,event_type) values ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','created')$$);
select pg_temp.expect_error('A: item_events を UPDATE できない', $$update public.item_events set to_value='x'$$);
select pg_temp.expect_error('A: item_events を DELETE できない', $$delete from public.item_events$$);
select pg_temp.expect_error('A: 商品の user_id を他人に変更できない', $$update public.items set user_id='bbbbbbbb-0000-0000-0000-000000000002'$$);
select pg_temp.expect_error('A: 予算設定の user_id を変更できない', $$update public.user_settings set user_id='bbbbbbbb-0000-0000-0000-000000000002'$$);
select pg_temp.expect_error('A: カテゴリーの user_id を変更できない', $$update public.categories set user_id='bbbbbbbb-0000-0000-0000-000000000002'$$);
select pg_temp.expect_error('A: 他人の user_id で商品を作成できない', $$insert into public.items(user_id,name) values ('bbbbbbbb-0000-0000-0000-000000000002','x')$$);
select pg_temp.expect_ok('A: 費用を登録できる', $$insert into public.other_expenses(id,name,estimated_amount) values ('22222222-0000-0000-0000-000000000001','畳',200000)$$);
select pg_temp.expect_ok('A: 商品だけに紐付く領収書は登録できる', $$insert into public.receipts(item_id,file_path) values ('11111111-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001/receipts/a.jpg')$$);
select pg_temp.expect_ok('A: 費用だけに紐付く領収書は登録できる', $$insert into public.receipts(expense_id,file_path) values ('22222222-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001/receipts/b.jpg')$$);
select pg_temp.expect_error('A: 商品と費用の両方に紐付く領収書は拒否', $$insert into public.receipts(item_id,expense_id,file_path) values ('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','x')$$);
select pg_temp.expect_error('A: どこにも紐付かない領収書は拒否', $$insert into public.receipts(file_path) values ('x')$$);
select pg_temp.expect_error('A: 内部関数 seed_user_defaults を呼べない', $$select public.seed_user_defaults('bbbbbbbb-0000-0000-0000-000000000002')$$);
select pg_temp.expect_error('A: トリガー関数 log_item_events を直接呼べない', $$select public.log_item_events()$$);
select pg_temp.expect_error('A: TRUNCATE できない', $$truncate public.items cascade$$);
select pg_temp.expect_ok('A: 自分のフォルダにファイル登録できる', $$insert into storage.objects(bucket_id,name,owner_id) values ('item-files','aaaaaaaa-0000-0000-0000-000000000001/images/a.jpg','aaaaaaaa-0000-0000-0000-000000000001')$$);
select pg_temp.expect_error('A: 他人のフォルダにファイル登録できない', $$insert into storage.objects(bucket_id,name) values ('item-files','bbbbbbbb-0000-0000-0000-000000000002/images/a.jpg')$$);
select pg_temp.expect_ok('A: ファイルの上書き・移動は0件（許可なし）', $q$do $x$ declare n int; begin update storage.objects set name='bbbbbbbb-0000-0000-0000-000000000002/x.jpg'; get diagnostics n = row_count; if n <> 0 then raise exception 'updated %', n; end if; end $x$ $q$);

-- ===== ユーザーB =====
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', false);
select pg_temp.expect_ok('B: Aの商品・履歴・領収書・費用・ファイルが見えない', $q$do $x$ begin
  if (select count(*) from public.items) + (select count(*) from public.item_events) + (select count(*) from public.receipts)
     + (select count(*) from public.other_expenses) + (select count(*) from storage.objects) <> 0 then raise exception 'leak'; end if; end $x$ $q$);
select pg_temp.expect_ok('B: Aの商品を更新・削除しても0件', $q$do $x$ declare n int; m int; begin
  update public.items set name='hack'; get diagnostics n = row_count; delete from public.items; get diagnostics m = row_count;
  if n + m <> 0 then raise exception 'changed'; end if; end $x$ $q$);
select pg_temp.expect_error('B: Aの商品を自分のカテゴリーに紐付けできない', $$insert into public.item_categories(item_id,category_id) select '11111111-0000-0000-0000-000000000001', id from public.categories limit 1$$);
select pg_temp.expect_error('B: Aの商品に領収書を付けられない', $$insert into public.receipts(item_id,file_path) values ('11111111-0000-0000-0000-000000000001','x')$$);

-- ===== 未ログイン =====
reset role;
set role anon;
select set_config('request.jwt.claims','{"role":"anon"}', false);
select pg_temp.expect_error('未ログイン: 商品を読めない', 'select * from public.items');
select pg_temp.expect_error('未ログイン: ensure_my_defaults を呼べない', 'select public.ensure_my_defaults()');
reset role;
select case when ok then '  ✓ ' else '  ✗ ' end || name from t_result;
select '合計 ' || count(*) filter (where ok) || '/' || count(*) || ' 合格' from t_result;
