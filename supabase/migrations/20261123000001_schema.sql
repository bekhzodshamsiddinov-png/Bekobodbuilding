-- Bekobod Building — core schema (phase 1).
-- One database serves the public site, the CRM, the showroom screen and the
-- Telegram bot. Security model lives in 20261123000002_rls.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type public.apartment_status as enum ('free', 'reserved', 'sold', 'hidden');
create type public.orientation      as enum ('yard', 'street');
create type public.lead_stage       as enum ('new', 'contacted', 'meeting', 'reserved', 'contract', 'lost');
create type public.staff_role       as enum ('owner', 'sales_head', 'manager', 'accountant', 'lawyer', 'admin');
create type public.reservation_status as enum ('active', 'expired', 'cancelled', 'converted');
create type public.payment_method   as enum ('cash', 'payme', 'click', 'bank');
create type public.tour_kind        as enum ('panorama', 'matterport');

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- catalogue
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  name        text not null,
  city        text not null default '',
  address     text not null default '',
  status      text not null default 'selling',
  hero_media  jsonb,
  usd_rate    numeric(12,2) not null default 12650 check (usd_rate > 0),
  created_at  timestamptz not null default now()
);

create table public.buildings (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  code         text not null check (code ~ '^[a-z0-9]{2,16}$'),
  name         text not null,
  floors       smallint not null check (floors between 1 and 120),
  entrances    smallint not null check (entrances between 1 and 40),
  first_residential_floor smallint not null default 1,
  facade_image text,
  floor_bands  jsonb,
  sort         smallint not null default 0,
  unique (project_id, code)
);

create table public.tours (
  id      uuid primary key default gen_random_uuid(),
  kind    public.tour_kind not null default 'panorama',
  scenes  jsonb not null default '[]'::jsonb
);

create table public.apartments (
  id             uuid primary key default gen_random_uuid(),
  building_id    uuid not null references public.buildings(id) on delete cascade,
  entrance       smallint not null check (entrance >= 1),
  floor          smallint not null,
  number         text not null,
  slug           text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  rooms          smallint not null check (rooms between 0 and 10),
  area_m2        numeric(7,2) not null check (area_m2 > 0),
  price_uzs      bigint not null check (price_uzs >= 0),
  price_usd      numeric(12,2) not null check (price_usd >= 0),
  status         public.apartment_status not null default 'free',
  orientation    public.orientation not null default 'yard',
  has_balcony    boolean not null default true,
  plan_2d_url    text,
  plan_3d_url    text,
  tour_id        uuid references public.tours(id) on delete set null,
  finish_options jsonb,
  updated_at     timestamptz not null default now(),
  unique (building_id, entrance, number)
);
create index apartments_building_status_idx on public.apartments (building_id, status);
create trigger apartments_touch before update on public.apartments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- staff
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  -- NULL = signed up but not approved: no CRM access until an owner/admin sets a role.
  role       public.staff_role,
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile without a role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- sales
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid references public.apartments(id) on delete set null,
  name         text not null check (char_length(name) between 1 and 120),
  phone        text not null check (phone ~ '^\+998[0-9]{9}$'),
  source       text not null default 'site' check (char_length(source) <= 40),
  utm          jsonb,
  stage        public.lead_stage not null default 'new',
  manager_id   uuid references public.profiles(id) on delete set null,
  notes        text check (char_length(notes) <= 2000),
  created_at   timestamptz not null default now()
);
create index leads_stage_idx on public.leads (stage, created_at desc);
create index leads_phone_idx on public.leads (phone, created_at desc);

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  phone              text not null check (phone ~ '^\+998[0-9]{9}$'),
  email              text,
  telegram_id        bigint,
  passport_doc_path  text, -- object in the private `passports` bucket
  created_at         timestamptz not null default now()
);

create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete set null,
  manager_id   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null,
  status       public.reservation_status not null default 'active',
  created_at   timestamptz not null default now()
);
-- At most one active reservation per apartment.
create unique index reservations_one_active on public.reservations (apartment_id) where status = 'active';

create table public.deals (
  id                uuid primary key default gen_random_uuid(),
  apartment_id      uuid not null references public.apartments(id),
  client_id         uuid not null references public.clients(id),
  price_final       bigint not null check (price_final >= 0),
  contract_no       text unique,
  contract_pdf_path text,
  signed_at         timestamptz,
  created_at        timestamptz not null default now()
);

create table public.payment_plans (
  id           uuid primary key default gen_random_uuid(),
  deal_id      uuid not null references public.deals(id) on delete cascade,
  schedule     jsonb not null default '[]'::jsonb,
  down_payment bigint not null default 0 check (down_payment >= 0)
);

create table public.payments (
  id       uuid primary key default gen_random_uuid(),
  deal_id  uuid not null references public.deals(id) on delete cascade,
  amount   bigint not null check (amount > 0),
  method   public.payment_method not null,
  paid_at  timestamptz not null default now()
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  table_name text not null,
  row_id     uuid,
  change     jsonb not null,
  created_at timestamptz not null default now()
);
create index audit_log_row_idx on public.audit_log (table_name, row_id, created_at desc);
