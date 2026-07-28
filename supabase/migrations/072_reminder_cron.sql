-- 072_reminder_cron.sql
-- Email reminder schedules via pg_cron + pg_net
-- Requires: pg_cron and pg_net extensions (enabled in Supabase by default)
--
-- BEFORE RUNNING:
--   1. Replace <PROJECT_REF> with your Supabase project reference ID
--   2. Replace <REMINDER_SECRET> with the value you set as REMINDER_SECRET secret
--   3. Run in Supabase SQL Editor

-- Store project config (avoids repeating URL in every cron job)
-- Fill these in manually in the Supabase SQL Editor — do NOT commit real values
alter database postgres set app.supabase_url = 'https://eiltoadzaqbuqdilsfpi.supabase.co';
alter database postgres set app.reminder_secret = '<YOUR_REMINDER_SECRET>';

-- Helper: builds the Edge Function URL for a given slot
create or replace function private.reminder_url(slot text)
returns text
language sql
stable
as $$
  select current_setting('app.supabase_url')
    || '/functions/v1/send-reminders?slot=' || slot
    || '&secret=' || current_setting('app.reminder_secret')
$$;

-- Helper: fires the Edge Function (called by each cron job)
create or replace function private.fire_reminder(slot text)
returns void
language plpgsql
as $$
begin
  perform net.http_post(
    url     := private.reminder_url(slot),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
end;
$$;

-- ── Schedules (UTC times) ─────────────────────────────────────────────────
-- Sofia = UTC+3 (EEST, Mar–Oct) / UTC+2 (EET, Nov–Feb)
-- Cron uses UTC, Edge Function uses Europe/Sofia for date logic.
-- Times below target 07:30–19:00 Sofia summer; in winter they fire 1h earlier.
-- Acceptable trade-off — adjust the UTC hours manually each season if needed.

-- 07:30 Sofia summer → 04:30 UTC
select cron.schedule('reminder-weight',      '30  4 * * *', 'select private.fire_reminder(''weight'')');

-- 08:00 Sofia summer → 05:00 UTC
select cron.schedule('reminder-habits',      ' 0  5 * * *', 'select private.fire_reminder(''habits'')');

-- 08:30 Sofia summer → 05:30 UTC
select cron.schedule('reminder-supplements', '30  5 * * *', 'select private.fire_reminder(''supplements'')');

-- 14:00 Sofia summer → 11:00 UTC
select cron.schedule('reminder-water',       ' 0 11 * * *', 'select private.fire_reminder(''water'')');

-- 16:00 Sofia summer → 13:00 UTC
select cron.schedule('reminder-food',        ' 0 13 * * *', 'select private.fire_reminder(''food'')');

-- 19:00 Sofia summer → 16:00 UTC
select cron.schedule('reminder-training',    ' 0 16 * * *', 'select private.fire_reminder(''training'')');

