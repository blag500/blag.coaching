-- 061_coach_readiness_access.sql
-- Allow coaches to read client sleep_logs, habit_completions, water_logs
-- (needed to compute client readiness in ClientDetail)

create policy "coach reads sleep_logs"
  on public.sleep_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

create policy "coach reads habit_completions"
  on public.habit_completions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

create policy "coach reads water_logs"
  on public.water_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
