-- Coach showcase posts: training & nutrition inspiration visible to all clients
create table if not exists public.showcase_posts (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in ('training', 'nutrition')),
  title      text not null,
  body       text,
  photo_url  text,
  sort_order int  not null default 0,
  created_at timestamptz default now()
);

alter table public.showcase_posts enable row level security;

do $$ begin
  create policy "Anyone reads showcase"
    on public.showcase_posts for select
    using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Coach manages showcase"
    on public.showcase_posts for all
    using (get_my_role() = 'coach')
    with check (get_my_role() = 'coach');
exception when duplicate_object then null;
end $$;

-- Public storage bucket for showcase post photos
insert into storage.buckets (id, name, public)
  values ('showcase-photos', 'showcase-photos', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Coach uploads showcase photos"
    on storage.objects for insert
    with check (
      bucket_id = 'showcase-photos'
      and get_my_role() = 'coach'
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone views showcase photos"
    on storage.objects for select
    using (bucket_id = 'showcase-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Coach deletes showcase photos"
    on storage.objects for delete
    using (
      bucket_id = 'showcase-photos'
      and get_my_role() = 'coach'
    );
exception when duplicate_object then null;
end $$;
