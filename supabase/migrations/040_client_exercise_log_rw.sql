-- 040_client_exercise_log_rw.sql
-- Allow clients to update and delete their own exercise log entries.
-- Previously only INSERT was allowed for clients; this enables corrections.

create policy "users_update_own" on public.exercise_logs
  for update using (auth.uid() = user_id);

create policy "users_delete_own" on public.exercise_logs
  for delete using (auth.uid() = user_id);
