-- ============================================================
-- 016_food_logs_update_policy.sql
-- Adds the missing UPDATE policy for food_logs.
-- Without this, edits are silently discarded by RLS.
-- ============================================================

create policy "food_logs_update" on public.food_logs
  for update using (auth.uid() = user_id);
