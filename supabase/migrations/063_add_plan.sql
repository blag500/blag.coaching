-- 063_add_plan.sql
-- Subscription plan selection step in onboarding flow.
-- New users land on plan selector before onboarding; existing users stay on free.

-- Drop any existing plan check constraint (may exist with different allowed values)
alter table public.profiles drop constraint if exists profiles_plan_check;

-- Add column if not exists (no inline check — we add constraint separately below)
alter table public.profiles add column if not exists plan text;

-- Recreate constraint with current allowed values
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'coaching'));

-- All existing users are on the free plan — skip the selector for them
update public.profiles
  set plan = 'free'
  where plan is null or plan not in ('free', 'pro', 'coaching');

-- New users created by handle_new_user trigger get plan = null
-- (no default set) so the plan selector is shown before onboarding
