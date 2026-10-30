-- Сигнали за микропокупка при спад на VUSA (30.10.2026).
--
-- invest-sync ги смята след всяка часова снимка и праща имейл. Два вида:
--   step — поредните −2 % от 30-дневния връх (ниво 1 = −2 %, 2 = −4 %…);
--          всяко ниво известява веднъж за даден връх, нов връх почва наново;
--   day  — −1,5 % или повече за 24 часа, най-много веднъж на 20 часа.
-- Сумата е предложение (5 / 10 / 15 €) — ключът към Trading 212 е само за
-- четене, нищо не се купува само. Добавка към редовната вноска, не замяна.

create table if not exists public.invest_dip_signals (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  ticker     text not null,
  kind       text not null check (kind in ('step', 'day')),
  level      int  not null default 0,      -- за step: 1 = −2 %, 2 = −4 %…
  price      numeric not null,
  ref_price  numeric not null,             -- върхът (step) или цената преди 24 ч (day)
  ref_at     timestamptz not null,
  drop_pct   numeric not null,             -- отрицателно число, напр. −4.1
  amount_eur numeric not null,
  emailed    boolean not null default false
);
create index if not exists invest_dip_signals_at on public.invest_dip_signals (ticker, kind, at desc);

alter table public.invest_dip_signals enable row level security;
drop policy if exists "invest_dip_signals_owner" on public.invest_dip_signals;
create policy "invest_dip_signals_owner" on public.invest_dip_signals
  for select using (public.is_invest_owner());
