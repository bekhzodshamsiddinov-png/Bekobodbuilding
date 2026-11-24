-- Phase 3 (CRM core): bulk repricing.
-- SECURITY INVOKER on purpose: the caller's RLS policies and the
-- price-guard trigger apply, so only owner / sales_head / admin succeed.

create or replace function public.bulk_reprice(
  p_building_id uuid,
  p_percent     numeric,
  p_only_free   boolean default true,
  p_rooms       smallint default null
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  n integer;
  v_rate numeric;
begin
  if p_percent is null or p_percent < -50 or p_percent > 50 or p_percent = 0 then
    raise exception 'invalid_percent' using errcode = '22023';
  end if;
  if not public.has_role('owner', 'sales_head', 'admin') then
    raise exception 'price_change_forbidden' using errcode = '42501';
  end if;

  select p.usd_rate into v_rate
    from public.buildings b join public.projects p on p.id = b.project_id
    where b.id = p_building_id;
  if v_rate is null then
    raise exception 'invalid_building' using errcode = '22023';
  end if;

  update public.apartments a
     set price_usd = round(a.price_usd * (1 + p_percent / 100) / 100) * 100,
         price_uzs = round(round(a.price_usd * (1 + p_percent / 100) / 100) * 100 * v_rate / 1000000) * 1000000
   where a.building_id = p_building_id
     and a.status <> 'sold'
     and (not p_only_free or a.status = 'free')
     and (p_rooms is null or a.rooms = p_rooms);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.bulk_reprice(uuid, numeric, boolean, smallint) from public, anon;
grant execute on function public.bulk_reprice(uuid, numeric, boolean, smallint) to authenticated;
