-- 089_feed_achievements.sql — Постижения във фийда.
--
-- Фийдът тръгна празен и празен си остава: никой не пише пръв в зала, в
-- която няма никой. Приложението обаче вече засича кога денят е бил идеален,
-- кога тренировката е приключила и кога серия навици е стигнала докрай —
-- само че тези неща умираха в едно popup-че и в localStorage.
--
-- Постижението е пост като всеки друг: същата таблица, същият ред, същите
-- харесвания и коментари. Различава го само kind, който казва на картата да
-- нарисува значка вместо да печата текст.

-- ── Вид и подробности ─────────────────────────────────────────────────
alter table public.posts
  add column if not exists kind text not null default 'post'
    check (kind in ('post', 'training', 'perfect', 'streak', 'plan')),
  -- Числата, които картата показва: колко упражнения, колко дни серия.
  -- jsonb, а не колони, защото всеки вид носи различни числа и колона за
  -- „дни серия“ би стояла празна на всеки друг ред.
  add column if not exists meta jsonb,
  add column if not exists log_date date;

-- Постижението няма текст, затова старото ограничение „или текст, или
-- снимка“ вече не важи за него: смисълът му е в kind и meta.
alter table public.posts drop constraint if exists posts_not_empty;
alter table public.posts add constraint posts_not_empty check (
  kind <> 'post'
  or coalesce(nullif(btrim(body), ''), photo_url) is not null
);

-- ── Веднъж на ден, на вид ─────────────────────────────────────────────
-- Защитата е тук, а не в браузъра. localStorage се чисти, приложението се
-- отваря на два телефона, а един и същ идеален ден, публикуван три пъти,
-- обръща фийда в спам. С този индекс повторното вписване просто не минава
-- и клиентът няма нужда да помни нищо.
create unique index if not exists posts_one_per_day
  on public.posts (user_id, kind, log_date)
  where kind <> 'post';

-- Ръчните постове нямат ден — те са толкова, колкото човек напише.
create index if not exists posts_kind_idx on public.posts (kind);
