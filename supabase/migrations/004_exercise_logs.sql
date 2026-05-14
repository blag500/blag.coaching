-- ============================================================
-- 004_exercise_logs.sql — Track exercise weights during workouts
-- Run in Supabase SQL Editor after 003_profile_extras.sql
-- ============================================================

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  exercise_name text not null,
  weight numeric,
  reps integer,
  sets integer,
  notes text,
  created_at timestamp with time zone default now()
);

alter table public.exercise_logs enable row level security;

create policy "users_select_own" on public.exercise_logs
  for select using (auth.uid() = user_id);

create policy "coach_select_all" on public.exercise_logs
  for select using ((select get_my_role()) = 'coach');

create policy "users_insert_own" on public.exercise_logs
  for insert with check (auth.uid() = user_id);

create index idx_exercise_logs_user_date on public.exercise_logs(user_id, date);
