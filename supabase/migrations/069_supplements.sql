-- 069_supplements.sql
-- Personal supplement stack + daily check-off log

create table public.supplements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  dose       text,
  timing     text,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

alter table public.supplements enable row level security;

create policy "suppl_own" on public.supplements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "suppl_coach_read" on public.supplements
  for select using (
    user_id in (
      select id from public.profiles
      where coach_id = (select id from public.profiles where id = auth.uid())
    )
  );

create table public.supplement_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  supplement_id uuid not null references public.supplements on delete cascade,
  date          date not null default current_date,
  unique(user_id, supplement_id, date)
);

alter table public.supplement_logs enable row level security;

create policy "suppl_log_own" on public.supplement_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
