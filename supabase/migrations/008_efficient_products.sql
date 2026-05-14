create table public.efficient_products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  source      text not null,
  price       text not null,
  indicator   text not null,
  added_by    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.efficient_products enable row level security;

-- Everyone (including anonymous) can read
create policy "public read efficient_products"
  on public.efficient_products for select
  using (true);

-- Any authenticated user can add a product
create policy "authenticated insert efficient_products"
  on public.efficient_products for insert
  with check (auth.uid() = added_by);

-- Users can delete their own entries
create policy "owner delete efficient_products"
  on public.efficient_products for delete
  using (auth.uid() = added_by);
