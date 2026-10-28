-- 145_svyat_messages.sql — писмата от картата „Пиши ми“ в светa (/svyat/, Р20), 28.10.2026.
--
-- Пише само функцията svyat-contact (service role); чете само собственикът.
-- IP-то не се пази — само отпечатък (sha256 със сол), колкото за лимита от 5 на час.

create table if not exists public.svyat_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  email      text not null,
  body       text not null,
  ip_hash    text not null,
  handled_at timestamptz
);
create index if not exists svyat_messages_ip_idx on public.svyat_messages (ip_hash, created_at desc);
alter table public.svyat_messages enable row level security;

drop policy if exists "owner reads messages" on public.svyat_messages;
create policy "owner reads messages" on public.svyat_messages
  for select using (public.is_tablo_owner());
drop policy if exists "owner marks messages" on public.svyat_messages;
create policy "owner marks messages" on public.svyat_messages
  for update using (public.is_tablo_owner()) with check (public.is_tablo_owner());
