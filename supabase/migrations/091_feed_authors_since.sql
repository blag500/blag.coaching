-- 091_feed_authors_since.sql — „От август 2026" на профилната страница.
--
-- Картата на автора порасна до страница и има място за ред под името. Датата
-- на регистрация е единственото, което може да стои там днес и да е вярно:
-- ниво няма, а „последно активен" изисква проследяване, каквото приложението
-- не води и няма да започне да води заради един ред текст.

create or replace view public.feed_authors
  with (security_invoker = off)
  as select id, name, avatar_url, role, bio, created_at from public.profiles;

grant select on public.feed_authors to authenticated;
