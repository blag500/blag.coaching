-- 098_friends.sql — Приятели и следване.
--
-- Две различни отношения, защото хората ги искат по различен повод.
--
-- Приятелството е взаимно и се пита: единият кани, другият приема. Дотук се
-- отваря адресникът — оттам се стига до профила и до бутона ПИШИ. Взаимно е,
-- защото „можеш да ми пишеш" не е нещо, което един човек решава сам за друг.
--
-- Следването е еднопосочно и не се пита. Клиент, който иска да гледа как се
-- справя някой по-напред от него, няма нужда от неговото разрешение — а онзи
-- няма причина да одобрява.
--
-- Фийдът НЕ се променя: постовете остават видими за всички, влезли в
-- приложението. Приятелството е адресник, не стена.

-- ── Приятелство ───────────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Една връзка между двама души, независимо кой е поканил.
--
-- Без този индекс А кани Б, Б кани А, и в базата стоят две покани за едно
-- приятелство — след което „приятели ли сме" има два отговора. Подредената
-- двойка прави реда един, а колоните пазят кой е поканил.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

do $$ begin
  create policy "Всеки вижда само своите връзки"
    on public.friendships for select
    using (requester_id = auth.uid() or addressee_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Каня само от свое име"
    on public.friendships for insert
    with check (requester_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Само поканеният отговаря. Поканилият не може да си приеме сам поканата —
-- което е целият смисъл на това да е взаимно.
do $$ begin
  create policy "Отговаря само поканеният"
    on public.friendships for update
    using (addressee_id = auth.uid())
    with check (addressee_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Развързването е за двамата: единият отменя поканата си, другият отказва
-- или спира приятелството. Едно и също действие, гледано от двете страни.
do $$ begin
  create policy "И двамата могат да развържат"
    on public.friendships for delete
    using (requester_id = auth.uid() or addressee_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- ── Следване ──────────────────────────────────────────────────────────
-- Съставният ключ е и правилото: един човек следва друг най-много веднъж.
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  followee_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Виждаш кого следваш и кой следва теб. Кой кого следва иначе не е твоя
-- работа — това е списък с хора, не публичен регистър.
do $$ begin
  create policy "Виждам своето следване"
    on public.follows for select
    using (follower_id = auth.uid() or followee_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Следвам само от свое име"
    on public.follows for insert
    with check (follower_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Спираш да следваш; или махаш някого, който следва теб.
do $$ begin
  create policy "Двете страни могат да спрат следването"
    on public.follows for delete
    using (follower_id = auth.uid() or followee_id = auth.uid());
exception when duplicate_object then null;
end $$;
