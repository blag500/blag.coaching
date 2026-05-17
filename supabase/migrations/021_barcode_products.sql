-- 021_barcode_products.sql
-- Shared barcode product cache: first scan fetches from Open Food Facts and stores here,
-- subsequent scans by any user get instant results from this table.

create table if not exists public.barcode_products (
  barcode       text primary key,
  name          text not null,
  kcal          numeric not null default 0,
  protein       numeric not null default 0,
  carbs         numeric not null default 0,
  fat           numeric not null default 0,
  typical_grams numeric not null default 100,
  created_at    timestamptz not null default now()
);

alter table public.barcode_products enable row level security;

-- any user (including anon) can look up barcodes
create policy "public read barcode products"
  on public.barcode_products for select
  using (true);

-- authenticated users can cache new products
create policy "authenticated insert barcode products"
  on public.barcode_products for insert
  with check (auth.role() = 'authenticated');
