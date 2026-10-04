-- 123_invest.sql
-- Таблото за инвестициите в Trading 212 (/invest/).
--
-- Браузърът никога не говори с Trading 212. Функцията invest-sync взима
-- данните с ключа от тайните на функциите и ги пише тук, а страницата чете
-- само оттук. Така ключът не стига до телефона, а лимитите на Trading 212
-- (една заявка на пет секунди за сметката) не зависят от това колко пъти
-- е отворена страницата.
--
-- Стойността във времето Trading 212 не я дава — дава само „сега". Затова
-- разписанието снима сметката всеки час и графиката расте от деня на пускане.
--
-- Достъпът не е по роля: треньорите са двама, а сметката е на един човек.
-- Собственикът стои в invest_owner, един ред, без нито едно правило — никой
-- през приложението не го чете и не го пише. Редът се слага на ръка:
--
--   insert into public.invest_owner (user_id)
--   select id from auth.users where email = '...';

create table if not exists public.invest_owner (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.invest_owner enable row level security;

create or replace function public.is_invest_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.invest_owner where user_id = auth.uid())
$$;

-- ── Снимките на сметката ────────────────────────────────────────────────────

create table if not exists public.invest_snapshots (
  id            bigint generated always as identity primary key,
  taken_at      timestamptz not null default now(),
  currency      text not null,
  total_value   numeric not null,   -- цялата сметка: инвестиции + кеш
  current_value numeric not null,   -- само инвестициите по текуща цена
  total_cost    numeric not null,   -- цената, платена за държаното сега
  unrealized    numeric not null,
  realized      numeric not null,   -- реализираното за цялото време
  cash_free     numeric not null,
  cash_in_pies  numeric not null default 0,
  cash_reserved numeric not null default 0,
  -- Позициите в момента на снимката. След седмица остават само на последната
  -- снимка за деня (invest_prune) — иначе часовите снимки трупат по няколко
  -- килобайта всяка, за подробност, която никой не гледа назад.
  positions     jsonb
);
create index if not exists invest_snapshots_taken_at on public.invest_snapshots (taken_at desc);

-- ── Историята: дивиденти и движения на пари ─────────────────────────────────

create table if not exists public.invest_dividends (
  reference       text primary key,
  paid_on         timestamptz not null,
  ticker          text,
  name            text,
  quantity        numeric,
  amount          numeric not null,   -- във валутата на сметката
  currency        text,
  gross_per_share numeric,
  type            text
);
create index if not exists invest_dividends_paid_on on public.invest_dividends (paid_on desc);

create table if not exists public.invest_transactions (
  reference text primary key,
  at        timestamptz not null,
  type      text not null,            -- DEPOSIT, WITHDRAW, FEE, TRANSFER
  amount    numeric not null,
  currency  text
);
create index if not exists invest_transactions_at on public.invest_transactions (at desc);

-- Докъде е стигнало изтеглянето на старата история. Trading 212 дава по
-- петдесет записа на страница и шест страници в минута; цялата история се
-- изтегля на части, по няколко страници на всяко пускане.
create table if not exists public.invest_sync_state (
  kind       text primary key,        -- 'dividends' | 'transactions'
  cursor     text,
  done       boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── Правила: само собственикът чете, никой не пише ──────────────────────────

alter table public.invest_snapshots    enable row level security;
alter table public.invest_dividends    enable row level security;
alter table public.invest_transactions enable row level security;
alter table public.invest_sync_state   enable row level security;

drop policy if exists "invest_snapshots_owner" on public.invest_snapshots;
create policy "invest_snapshots_owner" on public.invest_snapshots
  for select using (public.is_invest_owner());

drop policy if exists "invest_dividends_owner" on public.invest_dividends;
create policy "invest_dividends_owner" on public.invest_dividends
  for select using (public.is_invest_owner());

drop policy if exists "invest_transactions_owner" on public.invest_transactions;
create policy "invest_transactions_owner" on public.invest_transactions
  for select using (public.is_invest_owner());

drop policy if exists "invest_sync_state_owner" on public.invest_sync_state;
create policy "invest_sync_state_owner" on public.invest_sync_state
  for select using (public.is_invest_owner());

-- Последната снимка за всеки ден по софийско време — за графиките над месец.
-- security_invoker, за да минава през правилата на таблицата отдолу.
create or replace view public.invest_daily
with (security_invoker = true) as
select distinct on ((taken_at at time zone 'Europe/Sofia')::date)
  (taken_at at time zone 'Europe/Sofia')::date as day,
  taken_at, total_value, current_value, total_cost, cash_free
from public.invest_snapshots
order by (taken_at at time zone 'Europe/Sofia')::date, taken_at desc;

-- Позициите остават на последната снимка за деня, след седмица.
create or replace function public.invest_prune()
returns void
language sql
security definer
set search_path = public
as $$
  update public.invest_snapshots s
     set positions = null
   where s.positions is not null
     and s.taken_at < now() - interval '7 days'
     and s.id not in (
       select distinct on ((taken_at at time zone 'Europe/Sofia')::date) id
         from public.invest_snapshots
        order by (taken_at at time zone 'Europe/Sofia')::date, taken_at desc
     )
$$;
revoke all on function public.invest_prune() from public, anon, authenticated;

-- ── Разписанието: всеки час ─────────────────────────────────────────────────
-- Същата тайна като на нощната обиколка, в заглавка, не в адреса (виж 112).

create or replace function public.fire_invest_sync()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/invest-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bot-secret', (select value from public.app_secrets where name = 'reminder')
    ),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.fire_invest_sync() from public, anon, authenticated;

select cron.unschedule('invest-sync') where exists (
  select 1 from cron.job where jobname = 'invest-sync'
);

-- Седмата минута, не нулевата: на :00 тръгват всички разписания по света.
select cron.schedule('invest-sync', '7 * * * *', $$select public.fire_invest_sync()$$);
