-- Писмо до клиента, когато поръчката от Чийт Код е готова или отказана.
--
-- Имейлът е по избор: телефонът стига за обаждането, а всяко задължително
-- поле е още една стена преди обяда. Web Push отпадна, защото на iPhone
-- работи само за страница, добавена на началния екран — а повечето няма да я
-- добавят. Писмо стига до всички.
--
-- Писмото тръгва от базата, не от приложението: тригерът хваща смяната на
-- статуса, откъдето и да дойде, и вика функцията cheatcode-mail. Тайната е
-- същата като на разписанието (app_secrets, 116) и пътува в заглавка, не в
-- адреса (112).
--
-- `mailed` помни кои писма вече са тръгнали. Без него „Върни“ в панела и
-- второ „Готова“ пращат същото писмо втори път.

alter table public.cheatcode_orders
  add column if not exists email text
    check (email is null or (char_length(email) <= 120 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column if not exists mailed text[] not null default '{}';

create or replace function public.cheatcode_order_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or new.status is not distinct from old.status
     or new.status not in ('ready', 'cancelled')
     or new.status = any(new.mailed) then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/cheatcode-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', (select value from public.app_secrets where name = 'reminder')
    ),
    body    := jsonb_build_object('id', new.id, 'status', new.status),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

revoke all on function public.cheatcode_order_mail() from public, anon, authenticated;

drop trigger if exists cheatcode_order_mail on public.cheatcode_orders;
create trigger cheatcode_order_mail
  after update of status on public.cheatcode_orders
  for each row execute function public.cheatcode_order_mail();
