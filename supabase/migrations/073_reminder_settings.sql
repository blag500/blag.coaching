-- 073_reminder_settings.sql
-- Per-user email reminder preferences

create table public.reminder_settings (
  user_id         uuid primary key references auth.users on delete cascade,
  weight_email    boolean not null default true,
  habits_email    boolean not null default true,
  supplements_email boolean not null default true,
  water_email     boolean not null default true,
  food_email      boolean not null default true,
  training_email  boolean not null default true,
  updated_at      timestamptz not null default now()
);

alter table public.reminder_settings enable row level security;

create policy "reminder_settings_own" on public.reminder_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Coach can read all clients' settings
create policy "reminder_settings_coach_read" on public.reminder_settings
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'coach'
  );
