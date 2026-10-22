-- 140_shop_deals.sql — промоциите на седмицата (22.10.2026).
--
-- Николай: „първото, което виждаш — мега намалени неща с таймер“. Направено
-- честно, защото иначе е заблуждаваща практика (Закон за защита на
-- потребителите, чл. 68г; Omnibus):
--   * таймерът брои до ends_at — един и същ край за всички, не се нулира;
--   * was_cents е цената преди намалението — най-ниската за 30 дни
--     (магазинът е от 21.10 и цената не е сменяна, значи сегашната);
--   * цената в касата я смята shop-checkout от тази таблица, не браузърът.
-- Правилото за избора: промоционалната цена е поне 10 % над доставната.

create table if not exists public.shop_deals (
  product_id       text primary key references public.shop_products on delete cascade,
  deal_price_cents integer not null check (deal_price_cents > 0),
  was_cents        integer not null check (was_cents > 0),
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz not null,
  sort             integer not null default 0,
  check (deal_price_cents < was_cents),
  check (ends_at > starts_at)
);
alter table public.shop_deals enable row level security;
drop policy if exists "anyone reads deals" on public.shop_deals;
create policy "anyone reads deals" on public.shop_deals for select using (true);
drop policy if exists "owner writes deals" on public.shop_deals;
create policy "owner writes deals" on public.shop_deals
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- Седмицата 22.10 — неделя 26.10.2026, 23:59 софийско (след смяната на часа: +02).
insert into public.shop_deals (product_id, deal_price_cents, was_cents, starts_at, ends_at, sort) values
  ('keskin-oats-500',           99,   159,  '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 1),
  ('6pak-creatine-300',         999,  1349, '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 2),
  ('izzi-rice-semolina-500',    149,  199,  '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 3),
  ('levrone-crea-1000',         2699, 3649, '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 4),
  ('ostrovit-electrolytes-270', 749,  999,  '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 5),
  ('6pak-citrulline-450',       1999, 2699, '2026-10-22 00:00+03', '2026-10-26 23:59:59+02', 6)
on conflict (product_id) do update set deal_price_cents = excluded.deal_price_cents, was_cents = excluded.was_cents,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at, sort = excluded.sort;
