-- 151_zs_access.sql
-- Входът на магазина „Здраве и Сила“ (Брадистилов 10): телефон → SMS код →
-- запомнен телефон → бутон „Отвори“ → бравата.
--
-- SMS само при регистрация (27.11.2026): един SMS до български номер е
-- ~0,08–0,10 €; при всяко влизане това са ~100 €/мес. Затова кодът се праща
-- веднъж, телефонът получава таен ключ (zs_devices), и после вратата се отваря
-- с бутона, без SMS.
--
-- Отделно от auth.users: клиентите на магазина не са клиенти на приложението.
-- Пише само функцията zs-access (service role); собственикът чете (таблото).
-- Кодовете и ключовете се пазят като SHA-256, никога в чист вид.

create table if not exists public.zs_customers (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null unique check (phone ~ '^\+359[0-9]{8,9}$'),
  terms_version    text not null,
  terms_at         timestamptz not null default now(),
  blocked          boolean not null default false,
  test             boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.zs_otp (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  ip_hash     text,
  channel     text not null,            -- test | twilio | …
  test        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists zs_otp_phone on public.zs_otp (phone, created_at desc);
create index if not exists zs_otp_day on public.zs_otp (created_at);

create table if not exists public.zs_devices (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.zs_customers(id) on delete cascade,
  token_hash   text not null unique,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create table if not exists public.zs_entries (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.zs_customers(id) on delete set null,
  device_id    uuid references public.zs_devices(id) on delete set null,
  ok           boolean not null,
  door         text not null,            -- sim | shelly
  reason       text,
  created_at   timestamptz not null default now()
);
create index if not exists zs_entries_at on public.zs_entries (created_at desc);

alter table public.zs_customers enable row level security;
alter table public.zs_otp       enable row level security;
alter table public.zs_devices   enable row level security;
alter table public.zs_entries   enable row level security;

drop policy if exists "owner reads" on public.zs_customers;
create policy "owner reads" on public.zs_customers for select using (public.is_tablo_owner());
drop policy if exists "owner reads" on public.zs_devices;
create policy "owner reads" on public.zs_devices for select using (public.is_tablo_owner());
drop policy if exists "owner reads" on public.zs_entries;
create policy "owner reads" on public.zs_entries for select using (public.is_tablo_owner());
-- zs_otp: никой освен функцията.
