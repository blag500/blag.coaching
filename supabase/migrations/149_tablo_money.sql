-- 149_tablo_money.sql
-- Раздел „Пари" в /tablo/: приходите, разходите и графикът напред.
--
-- Repo-то е публично, затова числата не са в кода: един ред JSON тук, който
-- чете само собственикът (is_tablo_owner). Пише го компютърът —
-- D:\blag-ai\pari\build.py → money.sql, през `supabase db query --linked`.
-- Нито картовото извлечение, нито сметките в банката минават през repo-то.

create table if not exists public.tablo_money (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.tablo_money enable row level security;

drop policy if exists "owner reads money" on public.tablo_money;
create policy "owner reads money" on public.tablo_money
  for select using (public.is_tablo_owner());
