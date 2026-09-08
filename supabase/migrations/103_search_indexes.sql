-- Търсачката във фийда: индекси за ilike '%дума%'
--
-- Полето отгоре пита на всяко спиране на пръста, и пита с шаблон, който
-- започва със знак — а такъв шаблон не може да ползва обикновен btree индекс
-- и води до пълно четене на таблицата. При двайсет поста това е нищо, при
-- двайсет хиляди е половин секунда на буква.
--
-- pg_trgm разбива текста на тройки знаци и GIN индексът ги пази — това е
-- индексът, който ilike '%…%' може да ползва.

create extension if not exists pg_trgm;

create index if not exists posts_body_trgm_idx
  on public.posts using gin (body gin_trgm_ops);

-- Хората се четат през изгледа public.feed_authors, но той е изглед — редовете
-- и индексите са на profiles.
create index if not exists profiles_name_trgm_idx
  on public.profiles using gin (name gin_trgm_ops);

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
