-- ============================================================
-- 002_client_data.sql — Food logs, habit completions, weight logs
-- Run this in the Supabase SQL Editor after 001_init.sql
-- ============================================================

-- Food log entries (one row per food item per user per day)
create table if not exists public.food_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users on delete cascade not null,
  date       date        not null default current_date,
  name       text        not null,
  grams      numeric     not null,
  kcal       integer     not null,
  protein    numeric     not null,
  carbs      numeric     not null,
  fat        numeric     not null,
  added_at   timestamptz not null default now()
);

-- Habit completions (one row per habit per user per day)
create table if not exists public.habit_completions (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    references auth.users on delete cascade not null,
  date       date    not null default current_date,
  habit_id   text    not null,
  completed  boolean not null default false,
  unique(user_id, date, habit_id)
);

-- Weight log (one entry per user per day)
create table if not exists public.weight_logs (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    references auth.users on delete cascade not null,
  date       date    not null default current_date,
  kg         numeric not null,
  unique(user_id, date)
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
create index if not exists food_logs_user_date    on public.food_logs(user_id, date);
create index if not exists habits_user_date       on public.habit_completions(user_id, date);
create index if not exists weight_logs_user_date  on public.weight_logs(user_id, date);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.food_logs        enable row level security;
alter table public.habit_completions enable row level security;
alter table public.weight_logs      enable row level security;

-- Drop existing policies (idempotent)
drop policy if exists "food_logs_select"   on public.food_logs;
drop policy if exists "food_logs_insert"   on public.food_logs;
drop policy if exists "food_logs_delete"   on public.food_logs;
drop policy if exists "habits_select"      on public.habit_completions;
drop policy if exists "habits_insert"      on public.habit_completions;
drop policy if exists "habits_update"      on public.habit_completions;
drop policy if exists "weight_select"      on public.weight_logs;
drop policy if exists "weight_insert"      on public.weight_logs;
drop policy if exists "weight_delete"      on public.weight_logs;

-- food_logs: own row + coach reads all
create policy "food_logs_select" on public.food_logs
  for select using (auth.uid() = user_id or get_my_role() = 'coach');
create policy "food_logs_insert" on public.food_logs
  for insert with check (auth.uid() = user_id);
create policy "food_logs_delete" on public.food_logs
  for delete using (auth.uid() = user_id);

-- habit_completions: own row + coach reads all
create policy "habits_select" on public.habit_completions
  for select using (auth.uid() = user_id or get_my_role() = 'coach');
create policy "habits_insert" on public.habit_completions
  for insert with check (auth.uid() = user_id);
create policy "habits_update" on public.habit_completions
  for update using (auth.uid() = user_id);

-- weight_logs: own row + coach reads all
create policy "weight_select" on public.weight_logs
  for select using (auth.uid() = user_id or get_my_role() = 'coach');
create policy "weight_insert" on public.weight_logs
  for insert with check (auth.uid() = user_id);
create policy "weight_delete" on public.weight_logs
  for delete using (auth.uid() = user_id);
