-- 063_add_plan.sql
-- Subscription plan selection step in onboarding flow.
-- New users land on plan selector before onboarding; existing users stay on free.

alter table public.profiles
  add column if not exists plan text check (plan in ('free', 'pro', 'coaching'));

-- All existing users are on the free plan — skip the selector for them
update public.profiles
  set plan = 'free'
  where plan is null;

-- New users created by handle_new_user trigger get plan = null
-- (no default set) so the plan selector is shown before onboarding
