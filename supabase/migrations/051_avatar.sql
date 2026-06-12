alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Users upload own avatar"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars'
      and auth.role() = 'authenticated'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users update own avatar"
    on storage.objects for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Anyone views avatars"
    on storage.objects for select
    using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users delete own avatar"
    on storage.objects for delete
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null; end $$;
