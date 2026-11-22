-- 150_tablo_notes.sql
-- Бележки в таблото: записваш бързо, отмяташ, и телефонът ти напомня.
--
-- Отделна таблица, не още един `kind` в tablo_items: бележката има текст,
-- списък с отметки, час за напомняне и връзки — нищо от това не е на задачите
-- от сесиите. И Claude пише тук (by_claude), когато в чата кажеш „запиши ми“.
--
-- Известията са на собствен абонамент (tablo_push), не в push_subscriptions:
-- приложението трие „другите“ абонаменти на същия човек от същата услуга
-- (един телефон = едно известие), и двете иконки щяха да се трият взаимно.

create table if not exists public.tablo_notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 300),
  body        text not null default '' check (length(body) <= 20000),
  checklist   jsonb not null default '[]'::jsonb,   -- [{ "t": "…", "done": false }]
  area        text,                                 -- blag | shop | cheat | content | body | money | life
  pinned      boolean not null default false,
  done        boolean not null default false,
  done_at     timestamptz,
  remind_at   timestamptz,
  reminded_at timestamptz,                          -- пратено; смяната на remind_at го нулира
  by_claude   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tablo_notes_due on public.tablo_notes (remind_at)
  where reminded_at is null and not done;

alter table public.tablo_notes enable row level security;
drop policy if exists "owner notes" on public.tablo_notes;
create policy "owner notes" on public.tablo_notes
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- Нов час за напомняне = ново напомняне.
create or replace function public.tablo_notes_touch()
returns trigger
language plpgsql
as $$
begin
  if new.remind_at is distinct from old.remind_at then
    new.reminded_at := null;
  end if;
  if new.done and not old.done then new.done_at := now(); end if;
  if not new.done then new.done_at := null; end if;
  return new;
end;
$$;
drop trigger if exists tablo_notes_touch on public.tablo_notes;
create trigger tablo_notes_touch before update on public.tablo_notes
  for each row execute function public.tablo_notes_touch();

-- ── Абонаментът за известия на таблото ──────────────────────────────────────
create table if not exists public.tablo_push (
  endpoint     text primary key,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.tablo_push enable row level security;
drop policy if exists "owner push" on public.tablo_push;
create policy "owner push" on public.tablo_push
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- ── Разписанието: всяка минута, но функцията се вика само когато има нещо ──
create or replace function public.fire_tablo_remind()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tablo_notes
              where remind_at <= now() and reminded_at is null and not done) then
    perform net.http_post(
      url     := 'https://eiltoadzaqbuqdilsfpi.supabase.co/functions/v1/tablo-remind',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-bot-secret', (select value from public.app_secrets where name = 'reminder')
      ),
      timeout_milliseconds := 30000
    );
  end if;
end;
$$;
revoke all on function public.fire_tablo_remind() from public, anon, authenticated;

select cron.unschedule('tablo-remind') where exists (
  select 1 from cron.job where jobname = 'tablo-remind'
);
select cron.schedule('tablo-remind', '* * * * *', $$select public.fire_tablo_remind()$$);
