-- Security-definer function so clients can set their plan and ensure
-- approved=false regardless of RLS column restrictions.
create or replace function public.select_plan(plan_choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set plan = plan_choice, approved = false
  where id = auth.uid()
    and role = 'client';
end;
$$;

grant execute on function public.select_plan(text) to authenticated;
