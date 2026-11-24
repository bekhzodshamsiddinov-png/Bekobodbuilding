-- Row Level Security. Default stance: deny. Every table has RLS on; access is
-- granted only by the policies below.
--
--   anon (public site)  : read catalogue (projects, buildings, tours, non-hidden
--                         apartments). Leads only through public.submit_lead().
--   authenticated staff : by role, see role matrix in docs/SECURITY.md.
--   authenticated, no role (unapproved sign-up): same as anon.

-- ---------------------------------------------------------------- role helpers
create or replace function public.my_role() returns public.staff_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(variadic roles public.staff_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = any(roles) from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role is not null)
$$;

revoke all on function public.my_role() from public, anon;
revoke all on function public.has_role(public.staff_role[]) from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.my_role(), public.has_role(public.staff_role[]), public.is_staff() to authenticated;

-- ---------------------------------------------------------------- enable RLS everywhere
alter table public.projects      enable row level security;
alter table public.buildings     enable row level security;
alter table public.tours         enable row level security;
alter table public.apartments    enable row level security;
alter table public.profiles      enable row level security;
alter table public.leads         enable row level security;
alter table public.clients       enable row level security;
alter table public.reservations  enable row level security;
alter table public.deals         enable row level security;
alter table public.payment_plans enable row level security;
alter table public.payments      enable row level security;
alter table public.audit_log     enable row level security;

-- Defence in depth: anon has no table privileges outside the catalogue at all.
revoke all on public.profiles, public.leads, public.clients, public.reservations, public.deals,
  public.payment_plans, public.payments, public.audit_log from anon;
revoke insert, update, delete, truncate on public.projects, public.buildings, public.tours, public.apartments from anon;

-- ---------------------------------------------------------------- catalogue
create policy "catalogue: public read" on public.projects for select to anon, authenticated using (true);
create policy "catalogue: public read" on public.buildings for select to anon, authenticated using (true);
create policy "catalogue: public read" on public.tours for select to anon, authenticated using (true);

create policy "catalogue: heads write" on public.projects for all to authenticated
  using (public.has_role('owner', 'sales_head', 'admin')) with check (public.has_role('owner', 'sales_head', 'admin'));
create policy "catalogue: heads write" on public.buildings for all to authenticated
  using (public.has_role('owner', 'sales_head', 'admin')) with check (public.has_role('owner', 'sales_head', 'admin'));
create policy "catalogue: heads write" on public.tours for all to authenticated
  using (public.has_role('owner', 'sales_head', 'admin')) with check (public.has_role('owner', 'sales_head', 'admin'));

create policy "apartments: public read visible" on public.apartments for select to anon, authenticated
  using (status <> 'hidden');
create policy "apartments: staff read all" on public.apartments for select to authenticated
  using (public.is_staff());
-- Managers may change status; price changes are restricted further by a trigger.
create policy "apartments: sales update" on public.apartments for update to authenticated
  using (public.has_role('owner', 'sales_head', 'manager', 'admin'))
  with check (public.has_role('owner', 'sales_head', 'manager', 'admin'));
create policy "apartments: heads insert" on public.apartments for insert to authenticated
  with check (public.has_role('owner', 'sales_head', 'admin'));
create policy "apartments: heads delete" on public.apartments for delete to authenticated
  using (public.has_role('owner', 'admin'));

-- ---------------------------------------------------------------- profiles
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role('owner', 'sales_head', 'admin'));
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role('owner', 'admin'))
  with check (id = auth.uid() or public.has_role('owner', 'admin'));

-- ---------------------------------------------------------------- leads
create policy "leads: heads read all" on public.leads for select to authenticated
  using (public.has_role('owner', 'sales_head', 'admin'));
create policy "leads: manager read own or unassigned" on public.leads for select to authenticated
  using (public.has_role('manager') and (manager_id = auth.uid() or manager_id is null));
create policy "leads: heads update" on public.leads for update to authenticated
  using (public.has_role('owner', 'sales_head', 'admin'))
  with check (public.has_role('owner', 'sales_head', 'admin'));
create policy "leads: manager update own" on public.leads for update to authenticated
  using (public.has_role('manager') and (manager_id = auth.uid() or manager_id is null))
  with check (public.has_role('manager') and manager_id = auth.uid());
create policy "leads: staff insert" on public.leads for insert to authenticated
  with check (public.has_role('owner', 'sales_head', 'manager', 'admin'));
create policy "leads: owner delete" on public.leads for delete to authenticated
  using (public.has_role('owner', 'admin'));

-- ---------------------------------------------------------------- clients
create policy "clients: staff read" on public.clients for select to authenticated
  using (public.has_role('owner', 'sales_head', 'manager', 'lawyer', 'accountant', 'admin'));
create policy "clients: sales write" on public.clients for insert to authenticated
  with check (public.has_role('owner', 'sales_head', 'manager', 'lawyer', 'admin'));
create policy "clients: sales update" on public.clients for update to authenticated
  using (public.has_role('owner', 'sales_head', 'manager', 'lawyer', 'admin'))
  with check (public.has_role('owner', 'sales_head', 'manager', 'lawyer', 'admin'));

-- ---------------------------------------------------------------- reservations
create policy "reservations: staff read" on public.reservations for select to authenticated
  using (public.is_staff());
create policy "reservations: sales insert" on public.reservations for insert to authenticated
  with check (public.has_role('owner', 'sales_head', 'manager', 'admin'));
create policy "reservations: sales update" on public.reservations for update to authenticated
  using (public.has_role('owner', 'sales_head', 'admin') or (public.has_role('manager') and manager_id = auth.uid()))
  with check (public.has_role('owner', 'sales_head', 'admin') or (public.has_role('manager') and manager_id = auth.uid()));

-- ---------------------------------------------------------------- deals & money
create policy "deals: read" on public.deals for select to authenticated
  using (public.has_role('owner', 'sales_head', 'manager', 'accountant', 'lawyer', 'admin'));
create policy "deals: write" on public.deals for all to authenticated
  using (public.has_role('owner', 'sales_head', 'lawyer', 'admin'))
  with check (public.has_role('owner', 'sales_head', 'lawyer', 'admin'));

create policy "payment_plans: read" on public.payment_plans for select to authenticated
  using (public.has_role('owner', 'sales_head', 'manager', 'accountant', 'lawyer', 'admin'));
create policy "payment_plans: write" on public.payment_plans for all to authenticated
  using (public.has_role('owner', 'sales_head', 'accountant', 'admin'))
  with check (public.has_role('owner', 'sales_head', 'accountant', 'admin'));

create policy "payments: read" on public.payments for select to authenticated
  using (public.has_role('owner', 'sales_head', 'accountant', 'admin'));
create policy "payments: write" on public.payments for all to authenticated
  using (public.has_role('owner', 'accountant', 'admin'))
  with check (public.has_role('owner', 'accountant', 'admin'));

-- ---------------------------------------------------------------- audit
-- Rows are written only by security-definer triggers; nobody can insert/update/delete via the API.
create policy "audit: heads read" on public.audit_log for select to authenticated
  using (public.has_role('owner', 'sales_head', 'admin'));
revoke insert, update, delete, truncate on public.audit_log from authenticated;
