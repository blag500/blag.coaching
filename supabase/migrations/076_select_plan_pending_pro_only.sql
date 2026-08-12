-- plan_pending marks "waiting for the coach to look at me". A free user waits
-- for nobody, so raising it for them only filled the coach's pending list with
-- people who never asked for anything.
create or replace function public.select_plan(plan_choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set plan = plan_choice,
      plan_pending = (plan_choice <> 'free')
  where id = auth.uid()
    and role = 'client';
end;
$$;

grant execute on function public.select_plan(text) to authenticated;
