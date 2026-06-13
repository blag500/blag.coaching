create table if not exists public.water_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  log_date  date not null default current_date,
  glasses   integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

alter table public.water_logs enable row level security;

create policy "Users manage own water logs"
  on public.water_logs for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Coach reads client water logs"
  on public.water_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );
