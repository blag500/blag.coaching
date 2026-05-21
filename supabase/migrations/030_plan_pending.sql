alter table public.profiles
  add column if not exists plan_pending boolean not null default false;

-- Update select_plan to set plan_pending = true
create or replace function public.select_plan(plan_choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set plan = plan_choice, plan_pending = true
  where id = auth.uid()
    and role = 'client';
end;
$$;

grant execute on function public.select_plan(text) to authenticated;
