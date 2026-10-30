-- Дългите задачи на компютъра (генериране на видео и т.н.) в таблото (30.10.2026).
--
-- scripts/job-report.mjs пише ред на всеки 30 s, докато задачата върви; „Сега“
-- в /tablo/ го показва с лента. Ако updated_at остарее, страницата казва, че
-- компютърът не се обажда — по-полезно от лента, която стои.

create table if not exists public.tablo_jobs (
  id          text primary key,
  title       text not null,
  done        int  not null default 0,
  total       int  not null default 0,
  current     text,                      -- кое върви сега, напр. „сняг · 62 %“
  state       text not null default 'running' check (state in ('running', 'done', 'failed')),
  eta         timestamptz,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tablo_jobs enable row level security;
drop policy if exists "owner reads jobs" on public.tablo_jobs;
create policy "owner reads jobs" on public.tablo_jobs
  for select using (public.is_tablo_owner());
