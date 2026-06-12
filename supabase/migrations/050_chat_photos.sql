-- Allow photo-only chat messages (no text required) and store photo URL.
alter table public.messages alter column content drop not null;
alter table public.messages add column if not exists photo_url text;

-- Storage bucket for chat photos
insert into storage.buckets (id, name, public)
  values ('chat-photos', 'chat-photos', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Authenticated users upload chat photos"
    on storage.objects for insert
    with check (
      bucket_id = 'chat-photos'
      and auth.role() = 'authenticated'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone views chat photos"
    on storage.objects for select
    using (bucket_id = 'chat-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own chat photos"
    on storage.objects for delete
    using (
      bucket_id = 'chat-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
