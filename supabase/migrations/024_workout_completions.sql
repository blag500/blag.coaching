create table public.workout_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade not null,
  block_label    text not null,
  completed_date date not null default current_date,
  created_at     timestamptz not null default now(),
  unique (user_id, block_label, completed_date)
);

alter table public.workout_completions enable row level security;

create policy "users manage own completions"
  on public.workout_completions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "coach reads client completions"
  on public.workout_completions for select
  using ((select get_my_role()) = 'coach');
