-- 115_bot_knowledge.sql
-- Мозъкът: какво знае ботът извън вписаното от човека.
--
-- Дотук той знаеше само числата на клиента — какво е ял, колко тежи, кога е
-- тренирал. Това стига за „колко ми остава", но не и за „защо". Методът, по
-- който Николай работи, стоеше единствено в неговата глава и в обученията,
-- които е платил: всеки въпрос от рода на „как се кара пиковата седмица" или
-- „кога се сменя блокът" опираше до общите приказки на модела.
--
-- Тук се пази неговото знание, нарязано на парчета, всяко с вграждане —
-- триста осемдесет и четири числа, които казват за какво се говори в парчето.
-- Въпросът се вгражда по същия начин и се търси най-близкото по СМИСЪЛ, не по
-- дума: „как да сваля вода преди снимки" намира бележката за пиковата седмица,
-- без в нея да пише „снимки".
--
-- Три решения, които го държат да е справка, а не хранилище за раздаване:
--
--   1. Обхватът. Всяко парче е или общо (влиза в отговорите на всички), или
--      само на Николай (влиза само в неговите), или за един клиент. По
--      подразбиране — само за Николай: материал, платен от него, не става общ
--      по невнимание.
--
--   2. Правилата за четене пускат само собственика. Клиентът никога не вижда
--      парчетата — те влизат в подканата на сървъра и излизат оттам преразказани
--      в две изречения. Ботът отговаря със свои думи; източникът се казва по
--      име („по бележката ти за пиковата седмица"), а не се изсипва.
--
--   3. Числата на човека бият знанието. Знанието казва КАК, дневникът казва
--      КОЛКО — и когато двете се разминат, вярно е вписаното.

create extension if not exists vector with schema extensions;

create table if not exists public.bot_knowledge (
  id         uuid primary key default gen_random_uuid(),
  -- Чие е. Материалът е на треньора, дори когато отговаря на клиентски въпрос.
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Откъде е: име на бележка, заглавие на модул, каквото прави парчето
  -- разпознаваемо, когато ботът каже откъде знае.
  source     text not null,
  -- Заглавие на самото парче — обикновено подзаглавието, под което стои.
  title      text,
  body       text not null,

  -- 'private' — само в отговорите до собственика;
  -- 'shared'  — и в отговорите до клиентите му;
  -- 'client'  — само до един клиент (тогава client_id е попълнено).
  scope      text not null default 'private'
             check (scope in ('private', 'shared', 'client')),
  client_id  uuid references auth.users(id) on delete cascade,

  -- Откъде е дошло парчето, за да може да се пресинхронизира: път до файла в
  -- хранилището и отпечатък на съдържанието му.
  origin     text,
  digest     text,

  -- gte-small: моделът, който Supabase държи в самата крайна функция. Малък е
  -- нарочно — 384 числа се смятат на място, безплатно и без външен ключ, а за
  -- „кое парче говори за това" повече не трябва.
  embedding  extensions.vector(384)
);

create index if not exists bot_knowledge_owner_idx
  on public.bot_knowledge (owner_id, scope);

-- Едно парче на файл и заглавие: пресинхронизацията подменя, вместо да трупа.
create unique index if not exists bot_knowledge_origin_idx
  on public.bot_knowledge (owner_id, origin, title)
  where origin is not null;

-- HNSW, не ivfflat: индексът работи веднага, без да чака напълване, а при
-- няколко хиляди парчета разликата в скоростта е без значение.
create index if not exists bot_knowledge_vec_idx
  on public.bot_knowledge using hnsw (embedding extensions.vector_cosine_ops);

alter table public.bot_knowledge enable row level security;

drop policy if exists "bot_knowledge_own" on public.bot_knowledge;

-- Само собственикът пипа своето. Клиентът няма нужда от достъп: парчетата
-- влизат в подканата на сървъра, със сервизен ключ, и излизат преразказани.
create policy "bot_knowledge_own" on public.bot_knowledge
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── Търсенето ───────────────────────────────────────────────────────────────
--
-- Отделна функция, а не заявка от приложението: сравнението на вектори иска
-- операторът да се напише правилно, за да се ползва индексът, а това е точно
-- вид подробност, която се обърква при преписване.

create or replace function public.match_knowledge(
  query_embedding extensions.vector(384),
  owner uuid,
  asker uuid,
  match_count int default 5,
  min_similarity float default 0.35
)
returns table (id uuid, source text, title text, body text, similarity float)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select k.id, k.source, k.title, k.body,
         1 - (k.embedding <=> query_embedding) as similarity
  from public.bot_knowledge k
  where k.owner_id = owner
    and k.embedding is not null
    -- Кой пита решава какво се вижда: на самия собственик — всичко негово;
    -- на клиент — общото плюс писаното лично за него.
    and (
      asker = owner
      or k.scope = 'shared'
      or (k.scope = 'client' and k.client_id = asker)
    )
    and 1 - (k.embedding <=> query_embedding) > min_similarity
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_knowledge from public, anon, authenticated;
