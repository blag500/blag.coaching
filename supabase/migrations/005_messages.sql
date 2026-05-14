-- ============================================================
-- 005_messages.sql — In-app messaging between coach and clients
-- Run in Supabase SQL Editor after 004_exercise_logs.sql
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "users_view_own_messages" on public.messages
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "users_send_messages" on public.messages
  for insert with check (auth.uid() = from_user_id);

create index idx_messages_conversation on public.messages(from_user_id, to_user_id, created_at);
create index idx_messages_unread on public.messages(to_user_id, read_at) where read_at is null;
