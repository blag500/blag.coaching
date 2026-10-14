-- 134_tablo.sql
-- Личното табло (/tablo/): следващата стъпка, седмицата, идеите, чакащото,
-- и числата около тях — работата с Claude, промените по кода, Чийт Код,
-- приложението.
--
-- Като /invest/: собственикът стои в tablo_owner, един ред, без нито едно
-- правило. Редът се слага на ръка:
--
--   insert into public.tablo_owner (user_id)
--   select id from auth.users where email = '...';
--
-- Числата за работата с Claude и за кода живеят на компютъра (историята на
-- сесиите, git) — scripts/tablo-sync.mjs ги смята там и ги пише тук. Числата
-- за бизнеса са вече в базата — tablo_business() ги събира, без да отваря
-- самите таблици към страницата.

create table if not exists public.tablo_owner (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.tablo_owner enable row level security;

create or replace function public.is_tablo_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.tablo_owner where user_id = auth.uid())
$$;

-- ── Нещата на таблото ───────────────────────────────────────────────────────
-- Един вид ред за всичко, което човек пише и отмята: стъпката, идеите,
-- задачите, решенията, наблюдението, събитията в седмицата. Разликата е в kind.

create table if not exists public.tablo_items (
  id          text primary key,
  kind        text not null check (kind in ('focus', 'idea', 'you', 'decide', 'insight', 'event', 'weekly', 'finding')),
  title       text not null,
  why         text,
  area        text,
  status      text check (status in ('doing', 'think', 'spark', 'park', 'done')),
  done        boolean not null default false,
  done_at     timestamptz,
  sort        int not null default 0,
  day         date,          -- за event: денят; за weekly — нищо
  dow         int check (dow between 0 and 6),   -- за weekly: денят от седмицата
  link        text,
  severity    text check (severity in ('high', 'watch', 'low')),          -- за finding
  state       text check (state in ('open', 'fixed', 'proposal', 'dropped')), -- за finding
  by_claude   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tablo_items_kind on public.tablo_items (kind);
alter table public.tablo_items enable row level security;

drop policy if exists "owner reads items" on public.tablo_items;
create policy "owner reads items" on public.tablo_items
  for select using (public.is_tablo_owner());
drop policy if exists "owner writes items" on public.tablo_items;
create policy "owner writes items" on public.tablo_items
  for all using (public.is_tablo_owner()) with check (public.is_tablo_owner());

-- ── Числата по дни ──────────────────────────────────────────────────────────
-- Едно число на ден на ключ. Ключовете ги решава скриптът: claude.sessions,
-- claude.calls, claude.tools, tok.input, tok.cache_read, tok.cache_write,
-- tok.output, git.commits.<repo>, vault.notes.

create table if not exists public.tablo_daily (
  day   date not null,
  key   text not null,
  value numeric not null,
  primary key (day, key)
);
alter table public.tablo_daily enable row level security;
drop policy if exists "owner reads daily" on public.tablo_daily;
create policy "owner reads daily" on public.tablo_daily
  for select using (public.is_tablo_owner());

-- ── Сесиите с Claude ────────────────────────────────────────────────────────

create table if not exists public.tablo_sessions (
  id           text primary key,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  project      text,
  title        text,          -- първото изречение на човека, съкратено
  model        text,
  calls        int not null default 0,
  tool_calls   int not null default 0,
  tok_input    bigint not null default 0,
  tok_cache_read  bigint not null default 0,
  tok_cache_write bigint not null default 0,
  tok_output   bigint not null default 0
);
create index if not exists tablo_sessions_started on public.tablo_sessions (started_at desc);
alter table public.tablo_sessions enable row level security;
drop policy if exists "owner reads sessions" on public.tablo_sessions;
create policy "owner reads sessions" on public.tablo_sessions
  for select using (public.is_tablo_owner());

-- Кога скриптът е минал за последно — таблото казва колко стари са числата.
create table if not exists public.tablo_sync (
  source     text primary key,
  synced_at  timestamptz not null default now(),
  note       text
);
alter table public.tablo_sync enable row level security;
drop policy if exists "owner reads sync" on public.tablo_sync;
create policy "owner reads sync" on public.tablo_sync
  for select using (public.is_tablo_owner());

-- ── Бизнесът, събран на едно място ──────────────────────────────────────────
-- Страницата не чете поръчките, профилите и грешките направо — вижда само
-- броевете по дни за последните 28 дни. Връща празно на всеки друг.

create or replace function public.tablo_business()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since date := (now() at time zone 'Europe/Sofia')::date - 27;
  out jsonb;
begin
  if not public.is_tablo_owner() then
    return null;
  end if;

  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'n', n, 'eur', eur) order by d)
      from (
        select (created_at at time zone 'Europe/Sofia')::date d,
               count(*) n,
               round(sum(coalesce(total_cents, 0)) / 100.0, 2) eur
        from public.cheatcode_orders
        where created_at >= since and not coalesce(test, false)
        group by 1
      ) o), '[]'::jsonb),
    'orders_total', (select count(*) from public.cheatcode_orders where not coalesce(test, false)),
    'active_loggers', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d)
      from (
        select date d, count(distinct user_id) n
        from public.food_logs
        where date >= since
        group by 1
      ) f), '[]'::jsonb),
    'clients', (select count(*) from public.profiles where role = 'client'),
    'new_clients', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d)
      from (
        select (created_at at time zone 'Europe/Sofia')::date d, count(*) n
        from public.profiles
        where role = 'client' and created_at >= since
        group by 1
      ) p), '[]'::jsonb),
    'errors', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d)
      from (
        select (created_at at time zone 'Europe/Sofia')::date d, count(*) n
        from public.client_errors
        where created_at >= since
        group by 1
      ) e), '[]'::jsonb),
    'top_errors', coalesce((
      select jsonb_agg(jsonb_build_object('message', message, 'screen', screen, 'n', n, 'last', last) order by n desc)
      from (
        select left(message, 140) message, max(screen) screen, count(*) n, max(created_at) last
        from public.client_errors
        where created_at >= since
        group by 1
        order by 3 desc
        limit 5
      ) t), '[]'::jsonb),
    'bot', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'calls', n, 'tokens', t) order by d)
      from (
        select (created_at at time zone 'Europe/Sofia')::date d, count(*) n, sum(total_tokens) t
        from public.bot_usage
        where created_at >= since
        group by 1
      ) b), '[]'::jsonb)
  ) into out;

  return out;
end
$$;

revoke all on function public.tablo_business() from public, anon;
grant execute on function public.tablo_business() to authenticated;
