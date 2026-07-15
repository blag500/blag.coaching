-- weight_logs was missing an UPDATE policy, which caused upsert to silently
-- fail when overwriting the same day's entry (ON CONFLICT DO UPDATE needs UPDATE perm).
create policy "weight_update" on public.weight_logs
  for update using (auth.uid() = user_id);
