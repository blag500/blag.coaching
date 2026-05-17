-- 019_coach_delete_client.sql
-- Allow coaches to delete client profiles from the coach panel

create policy "coach delete client profiles"
  on public.profiles for delete
  using (
    id != auth.uid()
    and role = 'client'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role = 'coach'
    )
  );
