create table public.shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  archived_at timestamptz
);

create table public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid references public.shopping_lists(id) on delete cascade not null,
  name        text not null,
  quantity    text,
  checked     boolean default false,
  created_at  timestamptz default now()
);

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

create policy "users own shopping lists"
  on public.shopping_lists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users own shopping items"
  on public.shopping_items for all
  using (
    exists (
      select 1 from public.shopping_lists
      where shopping_lists.id = shopping_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists
      where shopping_lists.id = shopping_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );
