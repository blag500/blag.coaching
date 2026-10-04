-- 124_invest_orders.sql
-- Поръчките в Trading 212, изпълнените.
--
-- Сметката казва `realized: 0`, а стойността минус внесеното излиза с
-- около петдесет евро под печалбата по позициите, дивидентите и лихвата.
-- Разликата е в поръчките: всяко изпълнение носи своята реализирана печалба и
-- таксите си (най-вече обмяната на валута). Без тях „общо" не може да се
-- обясни, само да се покаже.

create table if not exists public.invest_orders (
  reference   text primary key,   -- id на поръчката в Trading 212
  at          timestamptz not null,
  ticker      text,
  name        text,
  side        text,                -- BUY | SELL
  quantity    numeric,
  price       numeric,             -- във валутата на книгата
  currency    text,                -- валутата на сметката (walletImpact)
  net_value   numeric,             -- във валутата на сметката
  realized    numeric not null default 0,
  fees        numeric not null default 0,
  fee_items   jsonb,               -- [{name, quantity, currency}]
  status      text
);
create index if not exists invest_orders_at on public.invest_orders (at desc);

alter table public.invest_orders enable row level security;

create policy "invest_orders_owner" on public.invest_orders
  for select using (public.is_invest_owner());
