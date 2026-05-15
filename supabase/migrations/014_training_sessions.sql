-- ============================================================
-- 014_training_sessions.sql
-- Scheduling system: coach or client can propose sessions,
-- the other party confirms or declines.
-- ============================================================

create table if not exists public.training_sessions (
  id               uuid        primary key default gen_random_uuid(),
  coach_id         uuid        not null,
  client_id        uuid        not null,
  requested_by     uuid        not null,
  scheduled_at     timestamptz not null,
  duration_minutes integer     not null default 60,
  title            text        not null default 'Тренировка',
  notes            text,
  status           text        not null default 'pending'
                   check (status in ('pending','confirmed','completed','declined','cancelled')),
  created_at       timestamptz not null default now(),

  constraint fk_ts_coach    foreign key (coach_id)    references public.profiles(id) on delete cascade,
  constraint fk_ts_client   foreign key (client_id)   references public.profiles(id) on delete cascade,
  constraint fk_ts_requestor foreign key (requested_by) references public.profiles(id) on delete cascade
);

create index if not exists training_sessions_coach_id_idx  on public.training_sessions(coach_id);
create index if not exists training_sessions_client_id_idx on public.training_sessions(client_id);
create index if not exists training_sessions_scheduled_idx on public.training_sessions(scheduled_at);

alter table public.training_sessions enable row level security;

create policy "ts_select" on public.training_sessions
  for select using (auth.uid() = coach_id or auth.uid() = client_id);

create policy "ts_insert" on public.training_sessions
  for insert with check (auth.uid() = coach_id or auth.uid() = client_id);

create policy "ts_update" on public.training_sessions
  for update using (auth.uid() = coach_id or auth.uid() = client_id);

create policy "ts_delete" on public.training_sessions
  for delete using (auth.uid() = coach_id);
