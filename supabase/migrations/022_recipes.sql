create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  name         text not null,
  photo_url    text,
  ingredients  jsonb not null default '[]',
  servings     numeric not null default 1,
  total_grams  numeric not null default 0,
  is_shared    boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "users manage own recipes"
  on public.recipes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clients can see their coach's shared recipes
create policy "clients see coach shared recipes"
  on public.recipes for select
  using (
    is_shared = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.coach_id = recipes.user_id
    )
  );
