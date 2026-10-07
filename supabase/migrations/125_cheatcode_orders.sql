-- Поръчките от Чийт Код (blag-coaching.com/cheatcode).
--
-- Страницата е статична и без вход, затова не пише тук сама: праща на
-- функцията cheatcode-order, а тя записва със service role. Затова няма
-- политика за insert — анонимен клиент не може да сложи ред, нито да прочете
-- чужд телефон. Чете и мени само треньорът.
--
-- `test` е истина, докато страницата не е пусната наистина (LIVE в
-- cheatcode/page.html). Тестовата поръчка стига до телефона на Николай като
-- истинска, но е белязана, за да не се сготви и да не се брои в оборота.

create table if not exists public.cheatcode_orders (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 2 and 80),
  phone        text not null check (char_length(phone) between 6 and 24),
  pickup_time  text check (pickup_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  note         text check (char_length(note) <= 300),
  -- Редовете, както ги е видял клиентът: име, конфигурация в грамове,
  -- макроси, единична цена в евроцентове, брой, алергени.
  lines        jsonb not null,
  box_count    int  not null check (box_count between 1 and 40),
  total_cents  int  not null check (total_cents between 0 and 100000),
  status       text not null default 'new'
               check (status in ('new', 'confirmed', 'ready', 'picked_up', 'cancelled')),
  test         boolean not null default true
);

create index if not exists cheatcode_orders_created_idx on public.cheatcode_orders (created_at desc);
create index if not exists cheatcode_orders_phone_idx   on public.cheatcode_orders (phone, created_at desc);

alter table public.cheatcode_orders enable row level security;

drop policy if exists "coach reads orders" on public.cheatcode_orders;
create policy "coach reads orders" on public.cheatcode_orders
  for select using (public.get_my_role() = 'coach');

drop policy if exists "coach updates orders" on public.cheatcode_orders;
create policy "coach updates orders" on public.cheatcode_orders
  for update using (public.get_my_role() = 'coach') with check (public.get_my_role() = 'coach');
