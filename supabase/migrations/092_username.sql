-- 092_username.sql — Кратко име, с което човек се разпознава.
--
-- Името в профила е това, което майка му е избрала, и двама Николаевци го
-- носят еднакво. Краткото име е негово собствено и е едно на цялото
-- приложение — затова е и единственото поле досега, което може да бъде
-- заето от друг.

alter table public.profiles
  add column if not exists username text;

-- Уникалност без значение на регистъра: „Blag" и „blag" са едно и също име
-- за всеки, който го чете, и две различни само за базата.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

-- Малки букви, цифри и долна черта. Ограничението е тук, а не само в
-- браузъра: полето е адрес, по който един ден ще се сочи отвън, а адрес с
-- интервал вътре е адрес, който някой ще счупи.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  username is null or username ~ '^[a-z0-9_]{3,20}$'
);

-- Изгледът, през който клиент чете чужд профил.
create or replace view public.feed_authors
  with (security_invoker = off)
  as select id, name, avatar_url, role, bio, created_at, username from public.profiles;

grant select on public.feed_authors to authenticated;
