-- 039_quiz_results.sql
-- Store daily quiz attempt results per user for the ЗНАНИЯ (Learn) page.

create table if not exists public.quiz_results (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  date         text        not null,                    -- YYYY-MM-DD
  correct      integer     not null,
  total        integer     not null,
  completed_at timestamptz not null default now(),
  constraint quiz_results_user_date_unique unique(user_id, date)
);

alter table public.quiz_results enable row level security;

-- Users see own results; coaches see all
create policy "quiz_results_select" on public.quiz_results
  for select using (auth.uid() = user_id or (select get_my_role()) = 'coach');

create policy "quiz_results_insert" on public.quiz_results
  for insert with check (auth.uid() = user_id);

-- Allow upsert (retry same day overwrites)
create policy "quiz_results_update" on public.quiz_results
  for update using (auth.uid() = user_id);

create index idx_quiz_results_user on public.quiz_results(user_id, date);
