create or replace function public.approve_client(client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only a coach can approve
  if (select role from public.profiles where id = auth.uid()) != 'coach' then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set plan_pending = false, approved = true
  where id = client_id
    and role = 'client';
end;
$$;

grant execute on function public.approve_client(uuid) to authenticated;
