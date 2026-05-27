-- 038_coach_exercise_log_access.sql
-- Allow coaches to insert, update and delete exercise log entries for clients.
-- Mirrors the pattern from 020_coach_food_log_access.sql.

create policy "coach insert exercise logs"
  on public.exercise_logs for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "coach update exercise logs"
  on public.exercise_logs for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "coach delete exercise logs"
  on public.exercise_logs for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );
