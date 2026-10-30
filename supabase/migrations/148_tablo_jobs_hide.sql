-- Махане на задача от „Върви на компютъра“ (31.10.2026).
--
-- Готовите стояха 6 часа, без начин да се махнат. Сега собственикът пише
-- hidden_at от таблото; скрита задача повече не се показва. Може да пипа само
-- тази колона — останалото пише scripts/job-report.mjs със service ролята на CLI.

alter table public.tablo_jobs add column if not exists hidden_at timestamptz;

revoke update on public.tablo_jobs from authenticated;
grant update (hidden_at) on public.tablo_jobs to authenticated;

drop policy if exists "owner hides jobs" on public.tablo_jobs;
create policy "owner hides jobs" on public.tablo_jobs
  for update using (public.is_tablo_owner()) with check (public.is_tablo_owner());
