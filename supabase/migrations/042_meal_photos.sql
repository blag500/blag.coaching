-- Photo column on food_logs
alter table public.food_logs add column if not exists photo_url text;

-- Storage bucket for meal photos
insert into storage.buckets (id, name, public)
  values ('meal-photos', 'meal-photos', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Users upload own meal photos"
    on storage.objects for insert
    with check (
      bucket_id = 'meal-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone can view meal photos"
    on storage.objects for select
    using (bucket_id = 'meal-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own meal photos"
    on storage.objects for delete
    using (
      bucket_id = 'meal-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
