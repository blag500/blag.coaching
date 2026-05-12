-- ============================================================
-- 001_init.sql — Blag Coaching initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id         uuid        references auth.users on delete cascade primary key,
  email      text,
  name       text,
  role       text        not null default 'client'
               check (role in ('client', 'coach')),
  calories   integer     not null default 2450,
  protein    integer     not null default 180,
  carbs      integer     not null default 250,
  fat        integer     not null default 70,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Security-definer helper — returns the caller's role without triggering RLS
-- (avoids the infinite-recursion problem with self-referencing policies)
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles enable row level security;

-- Drop policies if they already exist (idempotent re-run)
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

-- SELECT: own row, or coach sees all
create policy "profiles_select" on public.profiles
  for select
  using (
    auth.uid() = id
    or get_my_role() = 'coach'
  );

-- UPDATE: own row, or coach updates any
create policy "profiles_update" on public.profiles
  for update
  using (
    auth.uid() = id
    or get_my_role() = 'coach'
  );

-- INSERT: only the trigger (service role) inserts; deny direct client inserts
create policy "profiles_insert" on public.profiles
  for insert
  with check (auth.uid() = id);

-- ============================================================
-- To make a user a coach, run:
--   update public.profiles set role = 'coach' where email = 'your@email.com';
-- ============================================================
