-- RLS and business-rule tests. Each block raises on failure; run with
-- `psql -v ON_ERROR_STOP=1`. Executed by scripts/test-db.sh after migrations + seed.
\set QUIET on
\o /dev/null

-- Test users: one per role, plus a sign-up without a role.
insert into auth.users (id, email) values
  ('11111111-0000-4000-8000-000000000001', 'owner@test'),
  ('11111111-0000-4000-8000-000000000002', 'head@test'),
  ('11111111-0000-4000-8000-000000000003', 'manager@test'),
  ('11111111-0000-4000-8000-000000000004', 'manager2@test'),
  ('11111111-0000-4000-8000-000000000005', 'accountant@test'),
  ('11111111-0000-4000-8000-000000000006', 'nobody@test');
update public.profiles set role = 'owner'      where id = '11111111-0000-4000-8000-000000000001';
update public.profiles set role = 'sales_head' where id = '11111111-0000-4000-8000-000000000002';
update public.profiles set role = 'manager'    where id = '11111111-0000-4000-8000-000000000003';
update public.profiles set role = 'manager'    where id = '11111111-0000-4000-8000-000000000004';
update public.profiles set role = 'accountant' where id = '11111111-0000-4000-8000-000000000005';

create or replace function pg_temp.act_as(r text, uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), true);
  execute format('set local role %I', r);
end $$;

\echo '1. new auth users get a profile without a role'
do $$ begin
  if (select count(*) from public.profiles) <> 6 then raise exception 'expected 6 profiles'; end if;
  if (select role from public.profiles where id = '11111111-0000-4000-8000-000000000006') is not null then
    raise exception 'new user must not get a role'; end if;
end $$;

\echo '2. anon reads catalogue, never hidden apartments'
begin;
update public.apartments set status = 'hidden' where slug = 'b12a-p1-0101';
select pg_temp.act_as('anon', null);
do $$ begin
  if (select count(*) from public.projects) <> 1 then raise exception 'anon projects'; end if;
  if (select count(*) from public.buildings) <> 3 then raise exception 'anon buildings'; end if;
  if (select count(*) from public.apartments) <> 443 then raise exception 'anon should see 443, sees %', (select count(*) from public.apartments); end if;
  if exists (select 1 from public.apartments where slug = 'b12a-p1-0101') then raise exception 'hidden apartment leaked'; end if;
end $$;
rollback;

\echo '3. anon cannot write the catalogue or read private tables'
begin;
select pg_temp.act_as('anon', null);
do $$ begin
  begin update public.apartments set price_uzs = 1; raise exception 'anon update allowed';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.leads limit 1; raise exception 'anon read leads';
  exception when insufficient_privilege then null; end;
  begin insert into public.leads (name, phone) values ('x', '+998901234567'); raise exception 'anon insert leads';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.profiles limit 1; raise exception 'anon read profiles';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.clients limit 1; raise exception 'anon read clients';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.payments limit 1; raise exception 'anon read payments';
  exception when insufficient_privilege then null; end;
  begin perform public.expire_reservations(); raise exception 'anon ran expire_reservations';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

\echo '4. submit_lead validates, normalises and rate-limits'
begin;
select pg_temp.act_as('anon', null);
do $$
declare v uuid;
begin
  v := public.submit_lead('  Dilshod  ', '+998 (90) 123-45-67', null, 'site', '{"utm_source":"ig"}'::jsonb, null);
  if v is null then raise exception 'no id'; end if;
  begin perform public.submit_lead('', '+998901234567'); raise exception 'empty name accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_lead('A', '+99890123'); raise exception 'short phone accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_lead('A', '+79001234567'); raise exception 'foreign phone accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_lead('A', '+998901234567', gen_random_uuid()); raise exception 'unknown apartment accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_lead('A', '+998901234567', null, 'site', '"str"'::jsonb); raise exception 'non-object utm accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.submit_lead('A', '+998901234567', null, 'bad source!'); raise exception 'bad source accepted';
  exception when invalid_parameter_value then null; end;
  perform public.submit_lead('B', '+998901234567');
  perform public.submit_lead('C', '+998901234567');
  begin perform public.submit_lead('D', '+998901234567'); raise exception '4th lead in 10 min accepted';
  exception when program_limit_exceeded then null; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.leads where phone = '+998901234567') <> 3 then raise exception 'expected 3 leads'; end if;
  if (select name from public.leads order by created_at limit 1) <> 'Dilshod' then raise exception 'name not trimmed'; end if;
  if exists (select 1 from public.leads where stage <> 'new' or manager_id is not null) then raise exception 'anon set stage/manager'; end if;
end $$;
rollback;

\echo '5. user without a role sees only what anon sees'
begin;
select public.submit_lead('Lead', '+998911111111');
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000006');
do $$ begin
  if (select count(*) from public.leads) <> 0 then raise exception 'no-role user sees leads'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'no-role user sees other profiles'; end if;
  update public.apartments set status = 'sold' where slug = 'b16-p1-0201';
  if found then raise exception 'no-role user updated apartment'; end if;
end $$;
rollback;

\echo '6. nobody can promote themselves; only owner grants owner'
begin;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000006');
do $$ begin
  begin update public.profiles set role = 'owner' where id = '11111111-0000-4000-8000-000000000006';
    raise exception 'self-promotion allowed';
  exception when insufficient_privilege then null; end;
  update public.profiles set full_name = 'Ism' where id = '11111111-0000-4000-8000-000000000006';
  if not found then raise exception 'user cannot edit own name'; end if;
end $$;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000003');
do $$ begin
  begin update public.profiles set role = 'sales_head' where id = '11111111-0000-4000-8000-000000000003';
    raise exception 'manager self-promotion allowed';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000001');
do $$ begin
  update public.profiles set role = 'manager' where id = '11111111-0000-4000-8000-000000000006';
  if not found then raise exception 'owner cannot assign role'; end if;
end $$;
rollback;

\echo '7. managers change status but not price; changes are audited'
begin;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000003');
do $$ begin
  update public.apartments set status = 'reserved' where slug = 'b16-p1-0201';
  if not found then raise exception 'manager cannot change status'; end if;
  begin update public.apartments set price_uzs = price_uzs + 1 where slug = 'b16-p1-0201';
    raise exception 'manager changed price';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.audit_log) <> 0 then raise exception 'manager reads audit'; end if;
end $$;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000002');
do $$ begin
  update public.apartments set price_uzs = 999000000 where slug = 'b16-p1-0201';
  if not found then raise exception 'sales head cannot change price'; end if;
  if (select count(*) from public.audit_log where table_name = 'apartments') <> 2 then
    raise exception 'expected 2 audit rows, got %', (select count(*) from public.audit_log where table_name = 'apartments'); end if;
  begin delete from public.audit_log; raise exception 'audit deletable';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

\echo '8. managers see their own and unassigned leads only'
begin;
insert into public.leads (name, phone, manager_id) values
  ('Mine', '+998900000001', '11111111-0000-4000-8000-000000000003'),
  ('Other', '+998900000002', '11111111-0000-4000-8000-000000000004'),
  ('Free', '+998900000003', null);
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000003');
do $$ begin
  if (select count(*) from public.leads) <> 2 then raise exception 'manager sees % leads', (select count(*) from public.leads); end if;
  begin update public.leads set manager_id = '11111111-0000-4000-8000-000000000004' where name = 'Mine';
    raise exception 'manager reassigned lead to someone else';
  exception when insufficient_privilege then null; end;
  update public.leads set manager_id = '11111111-0000-4000-8000-000000000003' where name = 'Free';
  if not found then raise exception 'manager cannot claim unassigned lead'; end if;
end $$;
rollback;

\echo '9. accountant: payments yes, leads no'
begin;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000005');
do $$ begin
  perform 1 from public.payments;
  if (select count(*) from public.leads) <> 0 then raise exception 'accountant sees leads'; end if;
end $$;
rollback;

\echo '10. reservations flip status and expire back to free'
begin;
insert into public.reservations (apartment_id, manager_id, expires_at)
  select id, '11111111-0000-4000-8000-000000000003', now() - interval '1 minute'
  from public.apartments where slug = (select slug from public.apartments where status = 'free' order by slug limit 1);
do $$
declare s text;
begin
  select a.status into s from public.apartments a join public.reservations r on r.apartment_id = a.id;
  if s <> 'reserved' then raise exception 'not reserved: %', s; end if;
  begin
    insert into public.reservations (apartment_id, expires_at)
      select apartment_id, now() + interval '1 day' from public.reservations limit 1;
    raise exception 'double reservation allowed';
  exception when check_violation or unique_violation then null; end;
  if public.expire_reservations() <> 1 then raise exception 'expire count'; end if;
  select a.status into s from public.apartments a join public.reservations r on r.apartment_id = a.id;
  if s <> 'free' then raise exception 'not freed: %', s; end if;
end $$;
rollback;


\echo '11. bulk_reprice: heads only, bounded, audited, skips sold'
begin;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000003');
do $$ begin
  begin perform public.bulk_reprice('00000000-0000-4000-8002-000000000001', 5); raise exception 'manager bulk repriced';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act_as('authenticated', '11111111-0000-4000-8000-000000000002');
do $$
declare n int; before_sold bigint; before_free bigint;
begin
  select sum(price_uzs) into before_sold from public.apartments where building_id = '00000000-0000-4000-8002-000000000001' and status = 'sold';
  select sum(price_usd) into before_free from public.apartments where building_id = '00000000-0000-4000-8002-000000000001' and status = 'free';
  begin perform public.bulk_reprice('00000000-0000-4000-8002-000000000001', 80); raise exception '80%% accepted';
  exception when invalid_parameter_value then null; end;
  n := public.bulk_reprice('00000000-0000-4000-8002-000000000001', 10);
  if n <> (select count(*) from public.apartments where building_id = '00000000-0000-4000-8002-000000000001' and status = 'free') then
    raise exception 'wrong row count %', n; end if;
  if (select sum(price_uzs) from public.apartments where building_id = '00000000-0000-4000-8002-000000000001' and status = 'sold') <> before_sold then
    raise exception 'sold prices changed'; end if;
  if (select sum(price_usd) from public.apartments where building_id = '00000000-0000-4000-8002-000000000001' and status = 'free') <= before_free then
    raise exception 'free prices not raised'; end if;
  if (select count(*) from public.audit_log where table_name = 'apartments') <> n then raise exception 'not audited'; end if;
end $$;
rollback;
begin;
select pg_temp.act_as('anon', null);
do $$ begin
  begin perform public.bulk_reprice('00000000-0000-4000-8002-000000000001', 5); raise exception 'anon bulk repriced';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

\echo 'ALL DATABASE TESTS PASSED'
