create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  endpoint    text not null unique,
  subscription jsonb not null,
  created_at  timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "users manage own push subscriptions"
  on public.push_subscriptions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
