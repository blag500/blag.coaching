-- 085_one_account_per_person.sql
--
-- One person, one account — enforced in the database rather than in the
-- browser, because a rule that lives in the app is a rule anyone can skip by
-- not using the app.
--
-- auth.users already refuses the same address twice. What it does not refuse is
-- the same *mailbox* wearing a different address: Gmail ignores dots and
-- everything after a plus, so n.i.k+2@gmail.com and nik@gmail.com are one
-- inbox and two accounts. That is the gap this closes.

-- ── What counts as the same mailbox ──────────────────────────────────────
create or replace function public.normalise_email(addr text)
returns text
language plpgsql
immutable
as $$
declare
  a text := lower(trim(addr));
  local text;
  domain text;
begin
  if a is null or position('@' in a) = 0 then
    return a;
  end if;

  local  := split_part(a, '@', 1);
  domain := split_part(a, '@', 2);

  -- Plus-addressing is the same mailbox everywhere it is supported, and where
  -- it is not supported nobody can register the address in the first place.
  local := split_part(local, '+', 1);

  -- Dots are Google's alone. Stripping them anywhere else would merge two
  -- genuinely different people at providers that treat them as ordinary
  -- characters, which is a far worse mistake than missing a duplicate.
  if domain in ('gmail.com', 'googlemail.com') then
    local  := replace(local, '.', '');
    domain := 'gmail.com';
  end if;

  return local || '@' || domain;
end;
$$;

-- ── Throwaway inboxes ────────────────────────────────────────────────────
-- A table rather than a list in code: the next domain someone finds is one
-- insert, with no deploy and no release.
create table if not exists public.disposable_domains (
  domain text primary key
);

alter table public.disposable_domains enable row level security;

drop policy if exists "disposable_read" on public.disposable_domains;
create policy "disposable_read" on public.disposable_domains
  for select using (true);

insert into public.disposable_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.info'),
  ('10minutemail.com'), ('tempmail.com'), ('temp-mail.org'),
  ('throwawaymail.com'), ('yopmail.com'), ('yopmail.fr'),
  ('sharklasers.com'), ('grr.la'), ('trashmail.com'), ('trashmail.de'),
  ('getnada.com'), ('dispostable.com'), ('maildrop.cc'), ('mailnesia.com'),
  ('fakeinbox.com'), ('mytemp.email'), ('emailondeck.com'), ('moakt.com'),
  ('tempr.email'), ('discard.email'), ('spam4.me'), ('mohmal.com'),
  ('inboxbear.com'), ('tmail.ws'), ('luxusmail.org')
on conflict (domain) do nothing;

-- ── The key each profile is known by ─────────────────────────────────────
alter table public.profiles
  add column if not exists email_key text;

update public.profiles
   set email_key = public.normalise_email(email)
 where email_key is null and email is not null;

create index if not exists profiles_email_key on public.profiles(email_key);

comment on column public.profiles.email_key is
  'The mailbox behind the address: lowercased, plus-tag removed, Gmail dots removed. One person should have one of these.';

-- ── Asked before the form is submitted ───────────────────────────────────
-- The friendly half. The app calls this first so it can say what is wrong in
-- Bulgarian, instead of letting the signup fail and showing whatever the auth
-- service happens to return.
create or replace function public.email_status(addr text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := public.normalise_email(addr);
begin
  if key is null or position('@' in key) = 0 then
    return 'invalid';
  end if;

  if exists (select 1 from public.disposable_domains
              where domain = split_part(key, '@', 2)) then
    return 'disposable';
  end if;

  if exists (select 1 from public.profiles where email_key = key) then
    return 'taken';
  end if;

  return 'ok';
end;
$$;

grant execute on function public.email_status(text) to anon, authenticated;

-- ── The rule that cannot be skipped ──────────────────────────────────────
-- The check above is a courtesy; this is the rule. It runs inside the insert
-- that creates the account, so a refusal here means no auth user is created at
-- all — there is no half-made account to clean up afterwards.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := public.normalise_email(new.email);
begin
  if exists (select 1 from public.disposable_domains
              where domain = split_part(key, '@', 2)) then
    raise exception 'blag_disposable_email';
  end if;

  if exists (select 1 from public.profiles where email_key = key) then
    raise exception 'blag_duplicate_account';
  end if;

  insert into public.profiles (id, email, email_key, approved, onboarding_done)
  values (new.id, new.email, key, true, false)
  on conflict (id) do nothing;

  return new;
end;
$$;
