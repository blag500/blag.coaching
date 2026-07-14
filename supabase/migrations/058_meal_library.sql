create table if not exists public.meal_library (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  category      text not null default 'any',
  kcal          numeric not null default 0,
  protein       numeric not null default 0,
  carbs         numeric not null default 0,
  fat           numeric not null default 0,
  serving_grams int  not null default 1,
  prep_min      int  not null default 10,
  price_bgn     text,
  availability  text,
  tools         text[],
  notes         text,
  photo_url     text,
  created_at    timestamptz not null default now()
);

alter table public.meal_library enable row level security;

create policy "users own meal_library" on public.meal_library
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index meal_library_user_id_idx on public.meal_library(user_id);
