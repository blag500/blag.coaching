-- ============================================================
-- 011_coach_visibility.sql
-- Security-definer function so any authenticated coach can
-- fetch the list of all coaches without RLS evaluation issues.
-- Run in Supabase SQL Editor after 010_push_subscriptions.sql
-- ============================================================

create or replace function public.get_all_coaches()
returns table(id uuid, name text, email text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name, email
  from public.profiles
  where role = 'coach'
  order by name;
$$;

grant execute on function public.get_all_coaches() to authenticated;
