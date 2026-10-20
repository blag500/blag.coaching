-- ═══════════════════════════════════════════════════════════════════════════
-- Офертите от магазините — Lidl и Kaufland, всяка сутрин
-- ═══════════════════════════════════════════════════════════════════════════
--
-- offers-sync чете страниците с офертите, разпознава храните по име и пише
-- тук само онези, които носят макроси. Приложението чете оттук; страниците
-- на магазините не ги вижда никой телефон.
--
-- Макросите са на 100 г и идват от таблицата на храните в
-- supabase/functions/offers-sync/parse.ts, не от етикета: магазините не ги
-- публикуват. per_eur е грамовете от основния макрос за едно евро — числото,
-- по което се подрежда списъкът.

create table if not exists public.store_offers (
  id          bigint generated always as identity primary key,
  store       text not null check (store in ('lidl', 'kaufland')),
  ext_id      text not null,
  name        text not null,
  detail      text,
  pack        text,
  grams       numeric,
  price       numeric(10, 2) not null check (price > 0),
  old_price   numeric(10, 2),
  discount    int generated always as (
                case when old_price > price then round(100 * (1 - price / old_price))::int end
              ) stored,
  valid_from  date not null,
  valid_to    date not null,
  url         text,
  image       text,
  food        text not null,
  macro       text check (macro in ('protein', 'carbs', 'fat')),
  produce     boolean not null default false,
  kcal        numeric not null,
  protein     numeric not null,
  carbs       numeric not null,
  fat         numeric not null,
  per_eur     numeric,
  seen_at     timestamptz not null default now(),
  unique (store, ext_id, valid_from)
);

create index if not exists store_offers_valid on public.store_offers (valid_to, macro, per_eur desc);

alter table public.store_offers enable row level security;

-- Офертите са публични и в магазина — всеки влязъл ги вижда. Пише само
-- функцията, със service role.
drop policy if exists "authenticated read store_offers" on public.store_offers;
create policy "authenticated read store_offers"
  on public.store_offers for select
  to authenticated
  using (true);

-- ── Дневникът на пусканията ─────────────────────────────────────────────────
-- Ред на магазин на пускане. found = 0 значи, че магазинът е сменил
-- страницата си: функцията не пада, просто спира да намира. Чете само
-- service role.

create table if not exists public.store_offer_runs (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  store  text not null,
  found  int not null,
  kept   int not null,
  error  text
);

alter table public.store_offer_runs enable row level security;

-- ── Разписанието: всяка сутрин ───────────────────────────────────────────────
-- Новите оферти тръгват в понеделник и четвъртък; веднъж на ден ги хваща в
-- първия им ден, без да се гадае кой ден е брошурата на кой магазин.
-- Същата тайна като на нощната обиколка, в заглавка (виж 112, 123).

create or replace function public.fire_offers_sync()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/offers-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', (select value from public.app_secrets where name = 'reminder')
    ),
    timeout_milliseconds := 120000
  );
end;
$$;
revoke all on function public.fire_offers_sync() from public, anon, authenticated;

select cron.unschedule('offers-sync') where exists (
  select 1 from cron.job where jobname = 'offers-sync'
);

-- 04:23 UTC = 07:23 в София (06:23 през зимата) — след като магазините са
-- сменили страниците си през нощта, преди някой да е тръгнал за пазар.
select cron.schedule('offers-sync', '23 4 * * *', $$select public.fire_offers_sync()$$);
