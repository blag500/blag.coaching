-- 106_bot_memory.sql
-- Паметта на Благ Бот.
--
-- Дотук ботът беше четири копчета и филтър: питаше кога, солено или сладко,
-- колко готвене и колко голямо, после подаваше нещо от собствената ти история.
-- Не разбираше въпрос и не помнеше нищо — всеки разговор започваше от нула,
-- включително с предложения, които вече си отказал три пъти.
--
-- Три таблици, всяка с една задача:
--
--   bot_messages  — какво е казано. Нишката, която влиза обратно в подканата,
--                   за да има разговорът последователност.
--   bot_events    — какво е станало след думите: предложил е, приел си или си
--                   отказал. Това е суровината, от която се учи.
--   bot_profile   — какво е научил, свито до няколко реда текст. Един ред на
--                   човек, четим от самия него.
--
-- Защо научено в отделна таблица, а не да се смята от събитията при всяко
-- питане: подканата има таван, а събитията растат без край. Свиването се прави
-- рядко и наведнъж; разговорът чете готовото.

-- ── Какво е казано ──────────────────────────────────────────────────────────

create table if not exists public.bot_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 'user' | 'bot'
  role       text not null check (role in ('user', 'bot')),
  content    text not null,
  -- Какво е получил ботът наготово, когато е отговарял. Пази се, за да може
  -- по-късно да се види защо е казал каквото е казал — иначе всеки спор за
  -- сгрешен съвет опира до догадки.
  context    jsonb
);

create index if not exists bot_messages_user_idx
  on public.bot_messages (user_id, created_at desc);

-- ── Какво е станало ─────────────────────────────────────────────────────────

create table if not exists public.bot_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 'suggested' | 'accepted' | 'rejected'
  kind       text not null check (kind in ('suggested', 'accepted', 'rejected')),
  -- Какво точно: име на ястие, макроси, час от деня.
  payload    jsonb not null
);

create index if not exists bot_events_user_idx
  on public.bot_events (user_id, created_at desc);

-- ── Какво е научил ──────────────────────────────────────────────────────────

create table if not exists public.bot_profile (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  updated_at  timestamptz not null default now(),
  -- Свитото знание, в свободен текст на български. Текст, а не структура,
  -- защото това, което се научава за един човек, не се знае предварително —
  -- „не яде риба", „вечер иска сладко", „отказва всичко над двайсет минути".
  -- Човекът може да го прочете и да каже кое е сгрешено.
  learned     text,
  -- Колко събития са влезли в последното свиване: оттам се знае кога си струва
  -- да се направи наново.
  events_seen int not null default 0
);

-- ── Политики ────────────────────────────────────────────────────────────────
-- Своето, и само своето. Треньорът няма достъп: разговорът с бота е на човека,
-- а не бележка в картона му.

alter table public.bot_messages enable row level security;
alter table public.bot_events   enable row level security;
alter table public.bot_profile  enable row level security;

drop policy if exists "bot_messages_own" on public.bot_messages;
drop policy if exists "bot_events_own"   on public.bot_events;
drop policy if exists "bot_profile_own"  on public.bot_profile;

create policy "bot_messages_own" on public.bot_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bot_events_own" on public.bot_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bot_profile_own" on public.bot_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
