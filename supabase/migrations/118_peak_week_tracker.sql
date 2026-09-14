-- 118_peak_week_tracker.sql
-- Таблицата на пиковата седмица.
--
-- Планът вече го има (`peak_weeks`) и мереното през деня също (`peak_week_logs`).
-- Липсваше третото и най-полезното: редът на деня — какво НАИСТИНА е станало.
-- В метода на J3U това е отделен инструмент и причината е една: пиковата
-- седмица не се кара по план, а се чете от миналия път. Когато след година
-- застанеш пред същото шоу, единственото, което помага, е редът от миналата
-- година — колко вода, колко натрий, колко въглехидрати и как си изглеждал на
-- следващата сутрин.
--
-- Затова тук всяко нещо е отделна колона, а не бележка: колона се сравнява
-- между два дни и между две подготовки, а бележка се чете и се забравя.
--
-- Мерките са на приложението, не на източника: килограми, милилитри, грамове.
-- Клиентите тук не мерят в паунди и унции, а преводът в главата е точно онова,
-- което кара човек да спре да записва.

create table if not exists public.peak_week_days (
  id            uuid primary key default gen_random_uuid(),
  peak_week_id  uuid references public.peak_weeks(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  date          date not null,

  -- Трите мерения на деня. Сутрешното е сравнимото; следтренировъчното и
  -- вечерното показват колко държи водата през деня.
  bw_am         numeric(5, 2),
  bw_post       numeric(5, 2),
  bw_pm         numeric(5, 2),

  water_ml      integer,
  sodium_g      numeric(4, 1),
  potassium_g   numeric(4, 1),

  -- Какъв е бил денят: поддръжка, под поддръжка, зареждане, ден на шоуто.
  -- Затворен списък, защото по него се сравняват дни между подготовки.
  diet          text check (diet in ('td', 'ntd', 'load', 'show')),

  cho           integer,
  pro           integer,
  fat           integer,
  steps         integer,

  training      text,
  note          text,

  updated_at    timestamptz not null default now()
);

-- Един ред на ден. Пише се през upsert по този ключ, значи попълването на
-- клетка не може да роди втори ред за същия ден.
create unique index if not exists peak_week_days_day_idx
  on public.peak_week_days (peak_week_id, date);

alter table public.peak_week_days enable row level security;

-- Същият модел като в 094: човекът управлява своето, треньорът вижда всички.
do $$ begin
  create policy "Users manage own peak week days"
    on public.peak_week_days for all
    using      (auth.uid() = user_id or public.get_my_role() = 'coach')
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
