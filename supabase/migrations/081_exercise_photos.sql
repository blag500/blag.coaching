-- A picture per exercise.
--
-- A name in a plan is only a reminder if you already know what it means. "Тяга
-- в наклон" is four different movements depending on who wrote it, and the
-- person reading it in the gym is the one who has to guess. A photo settles it.
--
-- Keyed by exercise name rather than by plan entry, so a lift photographed once
-- is recognised everywhere it appears — in every block, and in every client's
-- programme that uses the same name.
--
-- Every policy is dropped before it is created: Postgres has no
-- "create policy if not exists", so a migration that stops halfway cannot be
-- run again without this, and the second attempt fails on the one policy that
-- did get made.
create table if not exists public.exercise_photos (
  exercise_name text primary key,
  photo_url     text not null,
  added_by      uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

alter table public.exercise_photos enable row level security;

-- Shared, like the barcode cache: one person photographing a machine helps
-- everyone who trains it.
drop policy if exists "exercise photos public read" on public.exercise_photos;
create policy "exercise photos public read"
  on public.exercise_photos for select
  using (true);

drop policy if exists "exercise photos authenticated write" on public.exercise_photos;
create policy "exercise photos authenticated write"
  on public.exercise_photos for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "exercise photos authenticated update" on public.exercise_photos;
create policy "exercise photos authenticated update"
  on public.exercise_photos for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Storage ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('exercise-photos', 'exercise-photos', true)
on conflict do nothing;

drop policy if exists "exercise-photos public read" on storage.objects;
create policy "exercise-photos public read"
  on storage.objects for select
  using (bucket_id = 'exercise-photos');

drop policy if exists "exercise-photos authenticated upload" on storage.objects;
create policy "exercise-photos authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'exercise-photos'
    and auth.role() = 'authenticated'
  );

drop policy if exists "exercise-photos owner delete" on storage.objects;
create policy "exercise-photos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'exercise-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
