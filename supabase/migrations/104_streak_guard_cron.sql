-- 104_streak_guard_cron.sql
-- Вечерното напомняне за низа: pg_cron вика streak-guard веднъж на ден.
--
-- Преди пускане:
--   1. supabase functions deploy streak-guard
--   2. supabase secrets set STREAK_SECRET=<нещо дълго и случайно>
--   3. Замени <STREAK_SECRET> по-долу със същата стойност.
--
-- Тайната е в адреса, а не в header: pg_cron вика през net.http_post, който
-- не носи Authorization, и платформата би отрязала функцията преди да тръгне.
-- Същото важи и за send-reminders — виж коментара в config.toml.
--
-- Функцията сама решава до кого да отиде: само хора с абонамент за известия,
-- с низ от два дни нагоре, чийто днешен ден е още празен. Ако няма такива,
-- не изпраща нищо — затова е безопасно да се вика всяка вечер.

create or replace function public.fire_streak_guard()
returns void
language plpgsql
as $$
begin
  perform net.http_post(
    url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/streak-guard'
                 || '?secret=<STREAK_SECRET>',
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
end;
$$;

-- 19:30 София (лятно) → 16:30 UTC. През зимата пада час по-рано, което пак е
-- вечер — а по-точно от това иска часова зона на потребител, каквато няма.
--
-- Защо толкова късно: напомняне по обед е натякване към човек, който още има
-- цял ден пред себе си. Смисълът е в часа, в който денят наистина изтича.
select cron.unschedule('streak-guard') where exists (
  select 1 from cron.job where jobname = 'streak-guard'
);

select cron.schedule('streak-guard', '30 16 * * *', $$select public.fire_streak_guard()$$);
