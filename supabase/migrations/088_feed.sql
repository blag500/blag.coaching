-- 088_feed.sql — Общият фийд: постове, харесвания, коментари.
--
-- Таблото „Днес" се пренесе в Профил, а освободеното място в долната
-- навигация става фийд: единственото място в приложението, където клиентите
-- се виждат един друг. Затова четенето е отворено за всеки влязъл, а писането
-- е само за собствения ред — с изключение на треньора, който може да трие
-- всичко, защото той отговаря за това какво стои в общата зала.

-- ── Постове ───────────────────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text,
  photo_url  text,
  created_at timestamptz not null default now(),
  -- Празен пост не е пост. Или има текст, или има снимка.
  constraint posts_not_empty check (
    coalesce(nullif(btrim(body), ''), photo_url) is not null
  )
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx    on public.posts (user_id);

alter table public.posts enable row level security;

do $$ begin
  create policy "Signed-in users read the feed"
    on public.posts for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users write their own posts"
    on public.posts for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users edit their own posts"
    on public.posts for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own posts, coach deletes any"
    on public.posts for delete
    using (user_id = auth.uid() or get_my_role() = 'coach');
exception when duplicate_object then null;
end $$;

-- ── Харесвания ────────────────────────────────────────────────────────
-- Съставният ключ е и правилото: един човек, едно харесване на пост.
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

do $$ begin
  create policy "Signed-in users read likes"
    on public.post_likes for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users like as themselves"
    on public.post_likes for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users unlike their own"
    on public.post_likes for delete
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- ── Коментари ─────────────────────────────────────────────────────────
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

do $$ begin
  create policy "Signed-in users read comments"
    on public.post_comments for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users comment as themselves"
    on public.post_comments for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own comments, coach deletes any"
    on public.post_comments for delete
    using (user_id = auth.uid() or get_my_role() = 'coach');
exception when duplicate_object then null;
end $$;

-- ── Снимки към постовете ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('post-photos', 'post-photos', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "Authenticated users upload post photos"
    on storage.objects for insert
    with check (
      bucket_id = 'post-photos'
      and auth.role() = 'authenticated'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Anyone views post photos"
    on storage.objects for select
    using (bucket_id = 'post-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own post photos"
    on storage.objects for delete
    using (
      bucket_id = 'post-photos'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

-- ── Кой е авторът ─────────────────────────────────────────────────────
-- profiles се чете само от собственика и от треньора (001, 053), и с право:
-- в този ред стоят имейл, калории, целево тегло, план. Но фийд, в който всеки
-- пост е от „Някой", не е фийд.
--
-- Затова изгледът излага точно четирите колони, които една карта рисува, и
-- нищо повече. Изрично security_invoker = off: смисълът му е да заобиколи RLS
-- на profiles — това е единственото, което прави, и е причината да съществува.
create or replace view public.feed_authors
  with (security_invoker = off)
  as select id, name, avatar_url, role from public.profiles;

grant select on public.feed_authors to authenticated;
