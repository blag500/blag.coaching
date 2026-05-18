create table public.efficient_product_likes (
  product_id uuid references public.efficient_products(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  primary key (product_id, user_id)
);

alter table public.efficient_product_likes enable row level security;

create policy "public read likes"
  on public.efficient_product_likes for select
  using (true);

create policy "users manage own likes"
  on public.efficient_product_likes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
