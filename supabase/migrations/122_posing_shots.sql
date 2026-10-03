-- 122_posing_shots.sql — Снимките от позинга.
--
-- Една снимка на поза на ден. Сравнението е винаги „същата поза, две дати",
-- затова уникалността е (човек, поза, ден): второ снимане същия ден заменя
-- първото, вместо да трупа дубликати, между които после трябва да се избира.
--
-- Хранилището е ЧАСТНО. Това са снимки на тяло — линк, който някой е
-- копирал, не бива да отваря нищо. Приложението ги чете с временни линкове
-- (createSignedUrls). Кофите от 041 и 042 са публични; тази нарочно не е.
--
-- Моделът на достъп е като 094: един треньор, който вижда всички, и
-- човек, който пипа само своето.

create table if not exists public.posing_shots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  -- Същият списък като src/components/Posing/poses.js: четвъртинките
  -- (qf qr qb ql) и позите на бодибилдинга и класическата физика.
  pose_id     text not null check (pose_id in (
                'qf','qr','qb','ql',
                'fdb','fls','sc','bdb','bls','st','at','vac','fcp','mm')),
  taken_on    date not null,
  path        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, pose_id, taken_on)
);

create index if not exists posing_shots_user_pose_idx
  on public.posing_shots (user_id, pose_id, taken_on desc);

alter table public.posing_shots enable row level security;

do $$ begin
  create policy "Users manage own posing shots"
    on public.posing_shots for all
    using      (auth.uid() = user_id or public.get_my_role() = 'coach')
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public)
  values ('posing', 'posing', false)
  on conflict (id) do nothing;

-- Пътят е `<user_id>/<дата>/<поза>-<време>.jpg`; първата папка е собственикът.
do $$ begin
  create policy "Users upload own posing shots"
    on storage.objects for insert
    with check (
      bucket_id = 'posing'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Owner and coach read posing shots"
    on storage.objects for select
    using (
      bucket_id = 'posing'
      and (auth.uid()::text = (storage.foldername(name))[1]
           or public.get_my_role() = 'coach')
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users delete own posing shots"
    on storage.objects for delete
    using (
      bucket_id = 'posing'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
