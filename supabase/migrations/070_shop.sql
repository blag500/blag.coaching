-- 070_shop.sql — Product catalog, orders, order items

-- ── Catalog ───────────────────────────────────────────────────────────
create table public.catalog_products (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null,
  description      text,
  price_stotinki   integer     not null,          -- BGN × 100
  image_url        text,
  category         text        not null default 'other',
  kcal_per_serving integer     not null default 0,
  protein_per_serving numeric  not null default 0,
  carbs_per_serving   numeric  not null default 0,
  fat_per_serving     numeric  not null default 0,
  serving_size     numeric     not null default 100,
  serving_unit     text        not null default 'g',
  available        boolean     not null default true,
  sort_order       integer     not null default 0,
  created_at       timestamptz default now()
);

alter table public.catalog_products enable row level security;
-- Everyone can read the catalog
create policy "catalog_read"   on public.catalog_products for select using (true);
-- Only coach can manage products
create policy "catalog_coach"  on public.catalog_products for all
  using  (get_my_role() = 'coach')
  with check (get_my_role() = 'coach');

-- ── Orders ────────────────────────────────────────────────────────────
create table public.orders (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users on delete cascade,
  status                      text not null default 'pending_payment'
                                check (status in ('pending_payment','confirmed','preparing','delivered','cancelled')),
  total_stotinki              integer not null,
  delivery_address            text,
  delivery_notes              text,
  stripe_checkout_session_id  text,
  log_date                    date not null default current_date,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table public.orders enable row level security;
create policy "orders_own"   on public.orders for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "orders_coach" on public.orders for all
  using  (get_my_role() = 'coach');

-- ── Order items ───────────────────────────────────────────────────────
create table public.order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders on delete cascade,
  product_id           uuid references public.catalog_products on delete set null,
  qty                  integer     not null default 1,
  unit_price_stotinki  integer     not null,
  -- Snapshots at time of order (product may change later)
  name_snapshot        text        not null,
  kcal_snapshot        integer     not null,
  protein_snapshot     numeric     not null,
  carbs_snapshot       numeric     not null,
  fat_snapshot         numeric     not null,
  serving_size_snapshot numeric    not null,
  serving_unit_snapshot text       not null
);

alter table public.order_items enable row level security;
create policy "order_items_own" on public.order_items for all
  using  ((select user_id from public.orders where id = order_id) = auth.uid())
  with check ((select user_id from public.orders where id = order_id) = auth.uid());
create policy "order_items_coach" on public.order_items for all
  using  (get_my_role() = 'coach');

-- Updated_at trigger for orders
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();
