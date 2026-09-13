-- 116_app_secrets.sql
-- Тайната на разписанието се мести в базата и се ражда там.
--
-- Дотук тя стоеше на две места: в настройките на функциите (`REMINDER_SECRET`)
-- и изписана вътре в `reminder_url()`. Две места значи две смени — а тайна,
-- сменена наполовина, спира сутрешните напомняния тихо, до първата сутрин, в
-- която някой забележи, че не са дошли.
--
-- Има и второ, по-неудобно: за да смени такава тайна, човек трябва да я
-- напише някъде. Значи тя минава през ръцете на всеки, който помага — през
-- чата, през терминала, през историята на командите. Стойността, с която
-- работеше приложението досега, беше кратка позната дума и се появи в
-- дневниците на проекта, защото пътуваше в адреса.
--
-- Оттук нататък: ражда се в базата с gen_random_uuid(), чете се оттам и от
-- разписанието, и от самите функции (те влизат със сервизен ключ и минават
-- покрай правилата). Никой не я въвежда и никой не я вижда — смяната е един
-- ред SQL, който не съдържа стойност.

create table if not exists public.app_secrets (
  name       text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

-- Нито едно правило: значи никой през приложението не чете и не пише тук.
-- Сервизният ключ минава покрай правилата — а само крайните функции го имат.
drop policy if exists "app_secrets_none" on public.app_secrets;

insert into public.app_secrets (name, value)
values ('reminder', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

-- ── Адресите четат оттам ────────────────────────────────────────────────────

create or replace function public.reminder_url(slot text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/send-reminders'
    || '?slot=' || slot
    || '&secret=' || (select value from public.app_secrets where name = 'reminder')
$$;

create or replace function public.bot_watch_url()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/bot-watch'
    || '?secret=' || (select value from public.app_secrets where name = 'reminder')
$$;

revoke all on function public.reminder_url(text) from public, anon, authenticated;
revoke all on function public.bot_watch_url() from public, anon, authenticated;

-- Смяната оттук нататък е това и само това:
--   update public.app_secrets
--      set value = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
--          updated_at = now()
--    where name = 'reminder';
