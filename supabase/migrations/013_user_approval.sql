-- ============================================================
-- 013_user_approval.sql
-- Adds per-user approval gate. Existing users stay approved.
-- New signups start unapproved until a coach approves them.
-- Run in Supabase SQL Editor after 012_efficient_products_update_policy.sql
-- ============================================================

-- Add column; existing rows default to true (already have access)
alter table public.profiles
  add column if not exists approved boolean not null default true;

-- New signups should start unapproved
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, approved)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;
