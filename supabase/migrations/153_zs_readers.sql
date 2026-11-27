-- 153_zs_readers.sql
-- Четците при вратата (27.11.2026). Всеки четец е ред тук и се представя с
-- таен ключ (пази се като SHA-256). Така всяко влизане в zs_entries носи кой
-- четец го е пуснал, а изгубен или откраднат четец се спира с един ред
-- (revoked_at), без да се пипат другите.
--
-- Тестовата платформа /chetec/ се сдвоява сама, но само докато вратата е в
-- sim (ZS_DOOR = sim) — тогава редът е с test = true. Истинският четец се
-- добавя от собственика (скрипт или SQL), не от страница.

create table if not exists public.zs_readers (
  id            text primary key check (id ~ '^[a-z0-9-]{3,40}$'),  -- door-1, test-a1b2c3
  name          text not null,
  key_hash      text not null unique,
  direction     text not null default 'in' check (direction in ('in', 'out')),
  test          boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz,
  revoked_at    timestamptz
);

alter table public.zs_readers enable row level security;
drop policy if exists "owner reads" on public.zs_readers;
create policy "owner reads" on public.zs_readers for select using (public.is_tablo_owner());
