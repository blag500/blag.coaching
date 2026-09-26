-- 120_recipe_photos_bucket.sql — Хранилището за снимките на рецептите.
--
-- RecipeForm качва корицата на рецептата и снимките на стъпките в
-- 'recipe-photos', но хранилището никога не е било създадено: качването
-- падаше, грешката се пропускаше и рецептата се записваше без снимка.
-- Същият модел като meal-photos (042): публично четене, всеки качва и трие
-- само в своята папка — пътят е `<user_id>/...` и `<user_id>/steps/...`.

insert into storage.buckets (id, name, public)
  values ('recipe-photos', 'recipe-photos', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Users upload own recipe photos"
    on storage.objects for insert
    with check (
      bucket_id = 'recipe-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone can view recipe photos"
    on storage.objects for select
    using (bucket_id = 'recipe-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users update own recipe photos"
    on storage.objects for update
    using (
      bucket_id = 'recipe-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own recipe photos"
    on storage.objects for delete
    using (
      bucket_id = 'recipe-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
