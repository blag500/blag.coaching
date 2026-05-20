alter table public.profiles
  add column if not exists plan text check (plan in ('plus', 'pro'));
