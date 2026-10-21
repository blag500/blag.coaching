-- 135_shop.sql — онлайн магазинът „Здраве и Сила“ (/shop/), 21.10.2026.
--
-- Отделно от стария магазин в приложението (070_shop: catalog_products,
-- orders — за влезли клиенти, в лева). Тук се купува без акаунт: каталогът е
-- публичен, поръчката се пише само от функцията shop-checkout със service role,
-- а я чете само собственикът (is_tablo_owner).

-- ── Каталогът ────────────────────────────────────────────────────────────────
create table if not exists public.shop_products (
  id           text primary key,                 -- slug, напр. '6pak-creatine-500'
  category     text not null check (category in
                 ('protein', 'creatine', 'amino', 'preworkout', 'vitamins', 'electrolytes', 'snacks')),
  name         text not null,
  size_label   text not null default '',
  price_cents  integer not null check (price_cents > 0),
  image        text,
  description  text not null default '',
  flavors      text[] not null default '{}',
  sort         integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.shop_products enable row level security;
drop policy if exists "anyone reads active products" on public.shop_products;
create policy "anyone reads active products" on public.shop_products
  for select using (active or public.is_tablo_owner());
drop policy if exists "owner writes products" on public.shop_products;
create policy "owner writes products" on public.shop_products
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- Доставната цена и пазарът — отделно, за да не стигат до браузъра на купувача.
create table if not exists public.shop_supply (
  product_id       text primary key references public.shop_products on delete cascade,
  supplier         text not null,
  supplier_ref     text,             -- името при доставчика, за да се поръча същото
  cost_cents       integer not null,
  market_low_cents integer,          -- най-ниската цена на дребно (pazaruvaj.com)
  checked_on       date
);
alter table public.shop_supply enable row level security;
drop policy if exists "owner only supply" on public.shop_supply;
create policy "owner only supply" on public.shop_supply
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- ── Доставката ───────────────────────────────────────────────────────────────
-- Цените са тук, а не в кода, за да се сменят с един ред. Функцията смята от тях.
create table if not exists public.shop_delivery (
  id              text primary key,
  label           text not null,
  hint            text not null default '',
  price_cents     integer not null default 0,
  free_from_cents integer,           -- безплатна над тази сума; null — никога
  needs           text not null check (needs in ('office', 'address', 'sofia', 'none')),
  sort            integer not null default 0,
  active          boolean not null default true
);
alter table public.shop_delivery enable row level security;
drop policy if exists "anyone reads delivery" on public.shop_delivery;
create policy "anyone reads delivery" on public.shop_delivery for select using (active);
drop policy if exists "owner writes delivery" on public.shop_delivery;
create policy "owner writes delivery" on public.shop_delivery
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

insert into public.shop_delivery (id, label, hint, price_cents, free_from_cents, needs, sort) values
  ('econt-office',  'Офис на Еконт',            '1–2 работни дни', 349, 6000, 'office',  0),
  ('speedy-office', 'Офис на Спиди',            '1–2 работни дни', 349, 6000, 'office',  1),
  ('courier',       'До адрес с куриер',        '1–2 работни дни', 499, 6000, 'address', 2),
  ('sofia',         'Лично до вратата, София',  'до 2 дни, в удобен час', 249, 4000, 'sofia', 3),
  ('pickup',        'Взимане на място',         'ще ти пишем къде и кога', 0, null, 'none', 4)
on conflict (id) do nothing;

-- ── Поръчките ────────────────────────────────────────────────────────────────
create sequence if not exists public.shop_order_number start 1001;

create table if not exists public.shop_orders (
  id                 uuid primary key default gen_random_uuid(),
  number             integer not null default nextval('public.shop_order_number') unique,
  status             text not null default 'pending_payment' check (status in
                       ('pending_payment', 'paid', 'packed', 'shipped', 'delivered', 'cancelled')),
  email              text not null,
  name               text not null,
  phone              text not null,
  delivery_id        text not null references public.shop_delivery,
  delivery_details   text not null default '',   -- офис, адрес или бележка
  items              jsonb not null,             -- [{id, name, flavor, qty, price_cents}]
  subtotal_cents     integer not null,
  delivery_cents     integer not null,
  total_cents        integer not null,
  stripe_session_id  text,
  test_mode          boolean not null default true,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists shop_orders_created on public.shop_orders (created_at desc);
alter table public.shop_orders enable row level security;
drop policy if exists "owner reads orders" on public.shop_orders;
create policy "owner reads orders" on public.shop_orders
  for select using (public.is_tablo_owner());
drop policy if exists "owner updates orders" on public.shop_orders;
create policy "owner updates orders" on public.shop_orders
  for update using (public.is_tablo_owner()) with check (public.is_tablo_owner());
