-- 020_coach_food_log_access.sql
-- Allow coaches to insert, update and delete food log entries for their clients

create policy "coach insert food logs"
  on public.food_logs for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

create policy "coach update food logs"
  on public.food_logs for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

create policy "coach delete food logs"
  on public.food_logs for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );
