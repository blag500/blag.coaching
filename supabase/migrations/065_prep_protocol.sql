create table if not exists public.prep_protocols (
  id               uuid    primary key default gen_random_uuid(),
  user_id          uuid    references auth.users on delete cascade not null,
  competition_name text,
  competition_date date    not null,
  target_weight    numeric not null,
  start_weight     numeric not null,
  start_date       date    not null default current_date,
  tdee             integer,
  cardio_notes     text    default '',
  supplement_notes text    default '',
  general_notes    text    default '',
  active           boolean not null default true,
  created_at       timestamptz default now()
);

alter table public.prep_protocols enable row level security;

create policy "prep_own" on public.prep_protocols
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
