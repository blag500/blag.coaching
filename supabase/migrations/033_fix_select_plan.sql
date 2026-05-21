-- Re-apply select_plan to guarantee plan_pending = true is set.
-- Migration 029 had the old version (approved=false only); this overwrites it.
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
