-- 063_add_plan.sql
-- Subscription plan selection step in onboarding flow.

-- Drop any existing plan check constraint
alter table public.profiles drop constraint if exists profiles_plan_check;

-- Add column if not exists
alter table public.profiles add column if not exists plan text;

-- Clean up any invalid / legacy values BEFORE adding constraint
update public.profiles
  set plan = 'free'
  where plan is null or plan not in ('free', 'pro', 'coaching');

-- Now safe to add constraint
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'coaching'));

-- New users created by handle_new_user trigger will have plan = null
-- (column has no default) so they see the plan selector before onboarding
