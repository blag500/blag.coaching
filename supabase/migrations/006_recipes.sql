-- ============================================================
-- 006_recipes.sql — Custom foods and recipes library
-- Run in Supabase SQL Editor after 005_messages.sql
-- ============================================================

create table if not exists public.custom_foods (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  is_recipe     boolean     not null default false,
  serving_grams numeric     not null default 100,
  kcal          integer     not null,
  protein       numeric     not null default 0,
  carbs         numeric     not null default 0,
  fat           numeric     not null default 0,
  ingredients   jsonb,
  created_at    timestamptz not null default now()
);

alter table public.custom_foods enable row level security;

create policy "custom_foods_select" on public.custom_foods
  for select using (auth.uid() = user_id);

create policy "custom_foods_insert" on public.custom_foods
  for insert with check (auth.uid() = user_id);

create policy "custom_foods_delete" on public.custom_foods
  for delete using (auth.uid() = user_id);

create index if not exists idx_custom_foods_user on public.custom_foods(user_id, created_at desc);
