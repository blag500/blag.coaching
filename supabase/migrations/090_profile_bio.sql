-- 090_profile_bio.sql — Кратко представяне, видимо от фийда.
--
-- Постът показва име и кръгче. Кръгчето вече води до карта с човека зад
-- поста, а карта с празно място под името е повод да я няма. Едно поле,
-- което всеки пише сам за себе си.

alter table public.profiles
  add column if not exists bio text;

-- Изгледът от 088 излага само това, което една карта рисува. Сега рисува и
-- биото, затова се преправя — колоните му са единственото, което един клиент
-- вижда от чужд профил, и списъкът трябва да остане къс нарочно.
create or replace view public.feed_authors
  with (security_invoker = off)
  as select id, name, avatar_url, role, bio from public.profiles;

grant select on public.feed_authors to authenticated;
