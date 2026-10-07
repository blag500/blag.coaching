-- Разписанието следва часа в София, не UTC.
--
-- pg_cron върви в UTC, а България сменя часа: лятно UTC+3, зимно UTC+2.
-- С фиксирани UTC часове след 25.10 всяко напомняне идва час по-рано
-- (чек-инът в 06:00 вместо в 07:00), а напролет — обратно.
--
-- Решението не е „местим часа два пъти в годината": всяка задача тръгва и в
-- двата възможни UTC часа, но действа само когато в София е нейният час.
-- Така е вярно целогодишно и никой не пипа нищо.
--
--   час в София   лятно UTC   зимно UTC
--   07:00 чек-ин        4           5
--   07:30 тегло         4           5
--   08:00 навици        5           6
--   08:30 добавки       5           6
--   14:00 вода         11          12
--   16:00 храна        13          14
--   19:00 тренировка   16          17
--   21:00 бот           18          19
--
-- daily-macro-reminder се изключва: заглавката му е „Bearer <sb_publishable…>"
-- — непопълнен образец — и всеки ден връща 401. Никога не е работило, а
-- reminder-food в 16:00 върши същото. Връща се с active := true, ако трябва.

create or replace function public.sofia_hour_is(h int)
returns boolean
language sql
stable
set search_path = public
as $$
  select extract(hour from (now() at time zone 'Europe/Sofia'))::int = h
$$;

select cron.alter_job((select jobid from cron.job where jobname = 'reminder-checkin'),
  schedule := '0 4,5 * * *',   command := 'select public.fire_reminder(''checkin'') where public.sofia_hour_is(7)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-weight'),
  schedule := '30 4,5 * * *',  command := 'select public.fire_reminder(''weight'') where public.sofia_hour_is(7)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-habits'),
  schedule := '0 5,6 * * *',   command := 'select public.fire_reminder(''habits'') where public.sofia_hour_is(8)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-supplements'),
  schedule := '30 5,6 * * *',  command := 'select public.fire_reminder(''supplements'') where public.sofia_hour_is(8)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-water'),
  schedule := '0 11,12 * * *', command := 'select public.fire_reminder(''water'') where public.sofia_hour_is(14)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-food'),
  schedule := '0 13,14 * * *', command := 'select public.fire_reminder(''food'') where public.sofia_hour_is(16)');
select cron.alter_job((select jobid from cron.job where jobname = 'reminder-training'),
  schedule := '0 16,17 * * *', command := 'select public.fire_reminder(''training'') where public.sofia_hour_is(19)');
select cron.alter_job((select jobid from cron.job where jobname = 'bot-watch'),
  schedule := '0 18,19 * * *', command := 'select public.fire_bot_watch() where public.sofia_hour_is(21)');

select cron.alter_job((select jobid from cron.job where jobname = 'daily-macro-reminder'), active := false);
