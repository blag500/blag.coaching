-- 062_self_onboarding.sql
-- Self-service onboarding: new users are auto-approved and go through
-- an in-app setup flow instead of waiting for coach approval.

-- New profile fields collected during onboarding
alter table public.profiles
  add column if not exists onboarding_done boolean not null default false,
  add column if not exists height_cm       numeric,
  add column if not exists gender          text check (gender in ('male', 'female')),
  add column if not exists activity_level  text check (activity_level in ('sedentary','light','moderate','active','very_active'));

-- Auto-approve all future signups (self-service)
alter table public.profiles
  alter column approved set default true;

-- Update the trigger so new users are auto-approved and start onboarding
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, approved, onboarding_done)
  values (new.id, new.email, true, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Mark all existing users as onboarding done — they're already set up
update public.profiles
  set onboarding_done = true
  where onboarding_done = false;
