-- 072_reminder_cron.sql
-- Email reminder schedules via pg_cron + pg_net
-- Requires: pg_cron and pg_net extensions (enabled in Supabase by default)
--
-- BEFORE RUNNING: replace <YOUR_REMINDER_SECRET> with your actual secret value

-- Helper: builds the Edge Function URL for a given slot
create or replace function public.reminder_url(slot text)
returns text
language sql
stable
as $$
  select 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/send-reminders'
    || '?slot=' || slot
    || '&secret=<YOUR_REMINDER_SECRET>'
$$;

create or replace function public.fire_reminder(slot text)
returns void
language plpgsql
as $$
begin
  perform net.http_post(
    url     := public.reminder_url(slot),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
end;
$$;

-- ── Schedules (UTC times) ─────────────────────────────────────────────────
-- Sofia = UTC+3 (EEST, Mar–Oct) / UTC+2 (EET, Nov–Feb)
-- Times below target 07:30–19:00 Sofia summer; in winter they fire 1h earlier.

-- 07:30 Sofia → 04:30 UTC
select cron.schedule('reminder-weight',      '30  4 * * *', $$select public.fire_reminder('weight')$$);

-- 08:00 Sofia → 05:00 UTC
select cron.schedule('reminder-habits',      ' 0  5 * * *', $$select public.fire_reminder('habits')$$);

-- 08:30 Sofia → 05:30 UTC
select cron.schedule('reminder-supplements', '30  5 * * *', $$select public.fire_reminder('supplements')$$);

-- 14:00 Sofia → 11:00 UTC
select cron.schedule('reminder-water',       ' 0 11 * * *', $$select public.fire_reminder('water')$$);

-- 16:00 Sofia → 13:00 UTC
select cron.schedule('reminder-food',        ' 0 13 * * *', $$select public.fire_reminder('food')$$);

-- 19:00 Sofia → 16:00 UTC
select cron.schedule('reminder-training',    ' 0 16 * * *', $$select public.fire_reminder('training')$$);
