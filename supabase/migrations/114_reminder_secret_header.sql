-- 114_reminder_secret_header.sql
-- И напомнянията спират да изписват тайната в дневника.
--
-- Същото като при нощната обиколка (112), само че тук е по-остро: тази функция
-- се вика шест пъти на ден, тоест тайната влизаше в записите шест пъти на ден,
-- откакто напомнянията съществуват.
--
-- `reminder_url()` остава — тя е единственото място, където тайната стои, и
-- оттам я вадят и двете викания. Променя се само какво пътува в адреса и какво
-- в заглавката.

create or replace function public.fire_reminder(slot text)
returns void
language plpgsql
as $$
declare
  full_url text;
  key      text;
begin
  full_url := public.reminder_url(slot);
  key      := split_part(full_url, 'secret=', 2);

  perform net.http_post(
    -- Само адресът и кой сигнал е: и двете могат да стоят в дневник.
    url     := split_part(full_url, '&secret=', 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', key
    )
  );
end;
$$;
