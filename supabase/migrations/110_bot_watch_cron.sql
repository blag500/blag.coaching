-- 110_bot_watch_cron.sql
-- Нощната обиколка на бота.
--
-- Веднъж вечерта, след като денят е свършил и вписването е приключило. Не
-- сутрин: наблюдение върху ден, който още не е започнал, е наблюдение върху
-- вчера, казано в най-неподходящия момент — човекът тъкмо отваря приложението,
-- за да впише закуската.
--
-- Адресът се сглобява от reminder_url, за да не се появи тайната на второ
-- място. Едно място, една смяна — а тайна, преписана два пъти, се завърта
-- само наполовина.

create or replace function public.bot_watch_url()
returns text
language sql
stable
as $$
  select replace(public.reminder_url('x'), 'send-reminders?slot=x&', 'bot-watch?')
$$;

create or replace function public.fire_bot_watch()
returns void
language plpgsql
as $$
begin
  perform net.http_post(
    url     := public.bot_watch_url(),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    -- Дванайсет клиента по едно обръщение към модела: минута стига с резерва.
    timeout_milliseconds := 60000
  );
end;
$$;

-- 21:00 София → 18:00 UTC (зимата 19:00 София — все още вечер).
select cron.unschedule('bot-watch') where exists (
  select 1 from cron.job where jobname = 'bot-watch'
);

select cron.schedule('bot-watch', '0 18 * * *', $$select public.fire_bot_watch()$$);
