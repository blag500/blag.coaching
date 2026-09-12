-- 112_bot_watch_secret_header.sql
-- Тайната излиза от адреса.
--
-- Викането на нощната обиколка минаваше със `?secret=` в адреса. Дневникът на
-- проекта пази адреса на всяко викане както си е — тоест тайната стоеше
-- изписана в него и се четеше от всеки, който отвори дневниците. Открих го,
-- докато търсех защо един отговор е паднал: реших да прочета записите и тайната
-- беше първото, което видях.
--
-- Оттук нататък пътува в заглавка. Функцията още приема и стария начин, за да
-- не падне нищо между двете, но разписанието вече не го ползва.

create or replace function public.fire_bot_watch()
returns void
language plpgsql
as $$
declare
  base text;
  key  text;
begin
  -- Тайната се вади от вече съществуващия адрес, вместо да се преписва тук:
  -- една тайна на едно място, преписаната два пъти се завърта само наполовина.
  base := public.bot_watch_url();
  key  := split_part(base, 'secret=', 2);

  perform net.http_post(
    url     := split_part(base, '?', 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', key
    ),
    timeout_milliseconds := 60000
  );
end;
$$;
