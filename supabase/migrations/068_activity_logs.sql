-- Activity logs: records of physical activity per user per day
create table public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  activity     text not null,
  duration_min int  not null check (duration_min > 0),
  kcal_burned  int  not null check (kcal_burned >= 0),
  created_at   timestamptz default now()
);

alter table public.activity_logs enable row level security;

create policy "activity_own" on public.activity_logs
  for all using (user_id = auth.uid());

create policy "activity_coach_read" on public.activity_logs
  for select using (
    user_id in (
      select id from public.profiles where coach_id = (
        select id from public.profiles where id = auth.uid()
      )
    )
  );

-- Coach can toggle whether burned calories add to a client's daily target
alter table public.profiles
  add column if not exists eat_back_calories boolean not null default false;
