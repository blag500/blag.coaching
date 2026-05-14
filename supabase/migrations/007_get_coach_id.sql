-- ============================================================
-- 007_get_coach_id.sql
-- Security-definer helper so clients can resolve the coach's
-- user ID without needing SELECT access to other profiles rows.
-- Run in Supabase SQL Editor after 006_recipes.sql
-- ============================================================

create or replace function public.get_coach_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where role = 'coach' limit 1;
$$;

-- Allow any authenticated user to call it
grant execute on function public.get_coach_id() to authenticated;
