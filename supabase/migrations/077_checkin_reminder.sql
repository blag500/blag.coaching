-- The morning check-in reminder.
--
-- Readiness is now measured against each person's own fortnight rather than a
-- fixed table, which makes a missed morning cost more than a blank row: it is a
-- hole in the baseline that every later day gets judged against. So the check-in
-- gets its own slot, and it runs first.
alter table public.reminder_settings
  add column if not exists checkin_email boolean not null default true;

-- 07:00 Sofia → 04:00 UTC, ahead of the weigh-in at 07:30.
select cron.schedule('reminder-checkin', ' 0  4 * * *', $$select public.fire_reminder('checkin')$$);
