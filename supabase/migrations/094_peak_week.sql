-- Пиковата седмица.
--
-- Две таблици, защото двете неща имат различна честота. `peak_weeks` е
-- планът: пише се веднъж и се пипа рядко. `peak_week_logs` е мерене — по
-- няколко пъти на ден, защото цялата идея на Част 2 от източника е, че
-- „повторимият вид" се намира, като се мериш сутрин, след храненията и вечер,
-- докато не се хванеш в момента, в който би излязъл на сцена.
--
-- Дневните отмятания стоят в `day_state` jsonb, а не в трета таблица: те са
-- шепа чекбокса на ден и никога не се търсят по стойност.

create table if not exists public.peak_weeks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  prep_id       uuid references public.prep_protocols(id) on delete set null,

  show_date     date not null,
  show_name     text,

  -- Зареждането: от колко дни преди тръгва и по колко грама на килограм.
  -- Диапазонът 3–10 е от източника; практически се стои в 4–6.
  load_days     smallint      not null default 3   check (load_days between 2 and 3),
  carb_per_kg   numeric(4, 1) not null default 5   check (carb_per_kg between 3 and 10),

  -- Умереното кардио на ден, от което се смятат стъпките (10 мин ≈ 2000 стъпки).
  cardio_min    smallint default 0,

  -- Поддръжката: дните преди зареждането се хранят до нея.
  tdee          integer,

  -- Денят преди сцената не е поредният ден по план, а преценка.
  adjust_choice text not null default 'hold' check (adjust_choice in ('keep', 'hold', 'pull')),

  -- Теглото, при което човекът е казал „ето така бих излязъл". Целта за деня.
  look_weight   numeric(5, 2),

  -- { "2026-10-08": { "done": ["carbs","train","steps"] } }
  day_state     jsonb not null default '{}'::jsonb,

  active        boolean default true,
  created_at    timestamptz default now()
);

create index if not exists peak_weeks_user_active_idx
  on public.peak_weeks (user_id, active, show_date desc);

-- Мереното през деня. Няколко реда на дата — това е смисълът.
create table if not exists public.peak_week_logs (
  id            uuid primary key default gen_random_uuid(),
  peak_week_id  uuid references public.peak_weeks(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,

  date          date not null,
  logged_at     timestamptz not null default now(),

  kg            numeric(5, 2),
  -- „Ето този вид." Върху него се сглобява целевото тегло за деня на шоуто.
  is_look       boolean not null default false,
  photo_url     text,
  note          text
);

create index if not exists peak_week_logs_week_date_idx
  on public.peak_week_logs (peak_week_id, date, logged_at);

alter table public.peak_weeks     enable row level security;
alter table public.peak_week_logs enable row level security;

-- Моделът тук е един треньор, който вижда всички — същият, който ползва
-- 093_checkin_v2.sql. В profiles няма coach_id и не бива да се измисля.
do $$ begin
  create policy "Users manage own peak weeks"
    on public.peak_weeks for all
    using      (auth.uid() = user_id or public.get_my_role() = 'coach')
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users manage own peak week logs"
    on public.peak_week_logs for all
    using      (auth.uid() = user_id or public.get_my_role() = 'coach')
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Снимките от пиковата седмица влизат в съществуващата кофа `form-checkins`
-- (създадена в 041), под път `<user_id>/peak/...`. Политиките ѝ гледат само
-- първата папка, така че нова кофа не е нужна.
