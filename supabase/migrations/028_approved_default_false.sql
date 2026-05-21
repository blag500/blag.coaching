-- Change approved column default to false so new signups always start unapproved.
-- Migration 001 inserted profiles without specifying approved, inheriting the
-- column default of true — this fixes that at the schema level.
alter table public.profiles
  alter column approved set default false;

-- Also ensure the trigger function explicitly sets approved = false
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
