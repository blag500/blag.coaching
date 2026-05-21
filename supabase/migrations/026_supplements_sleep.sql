-- Supplements
create table public.supplements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  created_by     uuid references public.profiles(id),
  name           text not null,
  dose           text,
  remind_morning   boolean not null default false,
  remind_afternoon boolean not null default false,
  remind_evening   boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.supplement_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  supplement_id  uuid not null references public.supplements(id) on delete cascade,
  date           date not null default current_date,
  taken_at       timestamptz not null default now(),
  unique(user_id, supplement_id, date)
);

-- Sleep logs
create table public.sleep_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date            date not null default current_date,
  duration_hours  numeric(4,2),
  quality         smallint check (quality between 1 and 5),
  notes           text,
  unique(user_id, date)
);

-- RLS
alter table public.supplements     enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.sleep_logs      enable row level security;

create policy "supplements_own" on public.supplements
  for all using (user_id = auth.uid() or created_by = auth.uid());

create policy "supplements_coach" on public.supplements
  for all using (get_my_role() = 'coach');

create policy "supplement_logs_own" on public.supplement_logs
  for all using (user_id = auth.uid());

create policy "supplement_logs_coach" on public.supplement_logs
  for select using (get_my_role() = 'coach');

create policy "sleep_logs_own" on public.sleep_logs
  for all using (user_id = auth.uid());

create policy "sleep_logs_coach" on public.sleep_logs
  for select using (get_my_role() = 'coach');

-- ── Scheduled supplement reminders ───────────────────────────────────────────
-- After running this migration, set up three Scheduled Jobs in the
-- Supabase dashboard (Database → Cron Jobs) pointing to the
-- supplement-reminders Edge Function:
--
--   morning:   0  6 * * *   POST .../functions/v1/supplement-reminders  {"period":"morning"}
--   afternoon: 0 13 * * *   POST .../functions/v1/supplement-reminders  {"period":"afternoon"}
--   evening:   0 18 * * *   POST .../functions/v1/supplement-reminders  {"period":"evening"}
--
-- Times are UTC+3 (Sofia) expressed in UTC above (06→03, 13→10, 18→15).
-- Adjust to UTC: morning 03:00, afternoon 10:00, evening 15:00 UTC.
