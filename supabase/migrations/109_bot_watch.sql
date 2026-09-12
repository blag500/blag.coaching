-- 109_bot_watch.sql
-- Ботът получава право да се обади сам.
--
-- Дотук той чакаше въпрос. Значеше, че се ползва от онези, които вече знаят
-- какво да питат — а човекът, чийто белтък е под целта трети ден подред, точно
-- този въпрос не си го задава. Числата стоят в базата, никой не ги гледа и
-- седмицата минава.
--
-- Оттук нататък веднъж вечерта се пресмятат няколко правила и ако едно е
-- изпълнено, ботът отваря разговор с едно наблюдение. Правилата са смятани, не
-- преценени от модел: моделът само облича в думи число, което вече е сметнато.
--
-- Три неща пазят това да не стане натякване:
--   * най-много едно наблюдение на вечер за човек;
--   * едно и също правило не се повтаря, докато не минат дни (за всяко — свои);
--   * нищо не се изпраща като известие. Наблюдението чака като непрочетен
--     разговор с точка на балончето. Известие, което казва „белтъкът ти е
--     малко", се изключва заедно с всички останали.

-- ── Непрочетено ─────────────────────────────────────────────────────────────

alter table public.bot_chats
  add column if not exists unread boolean not null default false;

-- Кой е започнал разговора. 'watch' са тези, които ботът е отворил сам — в
-- списъка стоят със знак, а и се броят отделно, когато се смята дали пак да се
-- обажда.
alter table public.bot_chats
  add column if not exists kind text not null default 'user'
  check (kind in ('user', 'watch'));

create index if not exists bot_chats_unread_idx
  on public.bot_chats (user_id) where unread;

-- ── Какво вече е казано ─────────────────────────────────────────────────────
--
-- Отделна таблица, а не bot_events: там стоят предложенията за храна и техните
-- приемания, а тук — кога кое правило се е задействало. Смесени в едно, двете
-- си чупят броячите взаимно (ученето брои събития, за да реши дали да свива).

create table if not exists public.bot_watch_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Кое правило: 'protein', 'weight_flat', 'water', 'missed_workout', 'checkin'
  rule       text not null,
  -- Сметнатото, за да може после да се види защо е казано каквото е казано.
  payload    jsonb,
  -- Отворило ли е разговор, или е било потиснато (вече казано, тих режим).
  chat_id    uuid references public.bot_chats(id) on delete set null
);

create index if not exists bot_watch_log_user_idx
  on public.bot_watch_log (user_id, rule, created_at desc);

alter table public.bot_watch_log enable row level security;

drop policy if exists "bot_watch_log_own" on public.bot_watch_log;

-- Само четене за човека: редовете се пишат от нощната функция със сервизен
-- ключ. Човек, който може да трие следата, може и да накара бота да повтаря
-- едно и също всяка вечер.
create policy "bot_watch_log_own" on public.bot_watch_log
  for select using (auth.uid() = user_id);
