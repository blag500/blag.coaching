-- Form check-ins table (weight + optional photo per day)
create table if not exists public.form_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null default current_date,
  weight_kg   numeric(5, 2),
  photo_url   text,
  notes       text,
  created_at  timestamptz default now()
);

create unique index if not exists form_checkins_user_date_idx
  on public.form_checkins (user_id, date);

alter table public.form_checkins enable row level security;

do $$ begin
  create policy "Users manage own check-ins"
    on public.form_checkins for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Storage bucket for check-in photos
insert into storage.buckets (id, name, public)
  values ('form-checkins', 'form-checkins', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Authenticated upload own photos"
    on storage.objects for insert
    with check (
      bucket_id = 'form-checkins'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone can view check-in photos"
    on storage.objects for select
    using (bucket_id = 'form-checkins');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own photos"
    on storage.objects for delete
    using (
      bucket_id = 'form-checkins'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
