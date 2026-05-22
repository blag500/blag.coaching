-- Add intake form fields to profiles so coaches can contact clients before approving.
alter table public.profiles
  add column if not exists phone       text,
  add column if not exists age         int,
  add column if not exists intake_goal  text,
  add column if not exists intake_notes text,
  add column if not exists intake_done  boolean not null default false;

-- Existing clients who already have a plan must not be shown the intake form.
update public.profiles
set intake_done = true
where role = 'client'
  and plan is not null;
