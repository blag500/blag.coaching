-- 018_efficient_products_photo.sql
-- Add optional photo to community product entries + storage bucket

alter table public.efficient_products
  add column if not exists photo_url text;

-- Storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict do nothing;

-- Anyone can read photos
create policy "product-photos public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- Authenticated users can upload
create policy "product-photos authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-photos'
    and auth.role() = 'authenticated'
  );

-- Owner can delete their own photos (path starts with their user id)
create policy "product-photos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
