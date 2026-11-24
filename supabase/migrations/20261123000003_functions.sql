-- Business rules enforced in the database, so they hold no matter which client
-- (site, CRM, bot, SQL editor via API) makes the change.

-- ---------------------------------------------------------------- public lead intake
-- The only way anon can create a lead. Validates and normalises input, checks
-- the apartment, and rate-limits per phone number and globally.
create or replace function public.submit_lead(
  p_name         text,
  p_phone        text,
  p_apartment_id uuid  default null,
  p_source       text  default 'site',
  p_utm          jsonb default null,
  p_notes        text  default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_phone  text := '+' || regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_name   text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', ' ', 'g'));
  v_notes  text := nullif(btrim(regexp_replace(coalesce(p_notes, ''), '[[:cntrl:]]', ' ', 'g')), '');
  v_source text := lower(coalesce(nullif(btrim(p_source), ''), 'site'));
  v_id     uuid;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_phone !~ '^\+998[0-9]{9}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  if v_source !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'invalid_source' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;
  if p_utm is not null and (jsonb_typeof(p_utm) <> 'object' or pg_column_size(p_utm) > 2048) then
    raise exception 'invalid_utm' using errcode = '22023';
  end if;
  if p_apartment_id is not null and not exists (
    select 1 from public.apartments where id = p_apartment_id and status <> 'hidden'
  ) then
    raise exception 'invalid_apartment' using errcode = '22023';
  end if;

  -- Rate limits: 3 per phone per 10 minutes, 300 overall per 10 minutes.
  if (select count(*) from public.leads where phone = v_phone and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.leads where created_at > now() - interval '10 minutes') >= 300 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  insert into public.leads (apartment_id, name, phone, source, utm, notes)
  values (p_apartment_id, v_name, v_phone, v_source, p_utm, v_notes)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_lead(text, text, uuid, text, jsonb, text) from public;
grant execute on function public.submit_lead(text, text, uuid, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------- apartments: guard + audit
-- Only owner / sales_head / admin may change prices. Requests without a user
-- (service role, cron) are trusted.
create or replace function public.guard_apartment_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null
     and (new.price_uzs is distinct from old.price_uzs or new.price_usd is distinct from old.price_usd)
     and not public.has_role('owner', 'sales_head', 'admin') then
    raise exception 'price_change_forbidden' using errcode = '42501';
  end if;
  if new.id <> old.id or new.building_id <> old.building_id then
    raise exception 'immutable_columns' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger apartments_guard before update on public.apartments
  for each row execute function public.guard_apartment_update();

create or replace function public.audit_apartment_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
     or new.price_uzs is distinct from old.price_uzs
     or new.price_usd is distinct from old.price_usd then
    insert into public.audit_log (actor_id, table_name, row_id, change)
    values (auth.uid(), 'apartments', new.id, jsonb_build_object(
      'status',    jsonb_build_array(old.status, new.status),
      'price_uzs', jsonb_build_array(old.price_uzs, new.price_uzs),
      'price_usd', jsonb_build_array(old.price_usd, new.price_usd)));
  end if;
  return null;
end $$;
create trigger apartments_audit after update on public.apartments
  for each row execute function public.audit_apartment_change();

-- ---------------------------------------------------------------- profiles: no self-promotion
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if not public.has_role('owner', 'admin') then
      raise exception 'role_change_forbidden' using errcode = '42501';
    end if;
    -- Only an owner can grant or revoke the owner role.
    if (new.role = 'owner' or old.role = 'owner') and not public.has_role('owner') then
      raise exception 'owner_role_forbidden' using errcode = '42501';
    end if;
  end if;
  if new.id <> old.id then
    raise exception 'immutable_columns' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, table_name, row_id, change)
    values (auth.uid(), 'profiles', new.id, jsonb_build_object('role', jsonb_build_array(old.role, new.role)));
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------- reservations
-- Creating an active reservation flips the apartment to `reserved`; only free
-- apartments can be reserved.
create or replace function public.reserve_apartment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    update public.apartments set status = 'reserved'
      where id = new.apartment_id and status = 'free';
    if not found then
      raise exception 'apartment_not_free' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger reservations_reserve before insert on public.reservations
  for each row execute function public.reserve_apartment();

-- Cancelling an active reservation frees the apartment again.
create or replace function public.release_apartment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'active' and new.status in ('cancelled', 'expired') then
    update public.apartments set status = 'free'
      where id = new.apartment_id and status = 'reserved';
  end if;
  return new;
end $$;
create trigger reservations_release after update on public.reservations
  for each row execute function public.release_apartment();

-- Expired reservations return their apartments to `free`. Scheduled below.
create or replace function public.expire_reservations() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.reservations set status = 'expired'
    where status = 'active' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_reservations() from public, anon, authenticated;

-- Run every 5 minutes when pg_cron is available (enable it in Supabase → Database → Extensions).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('expire-reservations', '*/5 * * * *', 'select public.expire_reservations()');
  end if;
end $$;

-- ---------------------------------------------------------------- storage: private passport scans
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('passports', 'passports', false)
      on conflict (id) do nothing;
    execute $p$create policy "passports: lawyer and owner read" on storage.objects for select to authenticated
      using (bucket_id = 'passports' and public.has_role('owner', 'lawyer'))$p$;
    execute $p$create policy "passports: lawyer and owner write" on storage.objects for insert to authenticated
      with check (bucket_id = 'passports' and public.has_role('owner', 'lawyer'))$p$;
  end if;
end $$;

-- ---------------------------------------------------------------- realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.apartments;
  end if;
end $$;
