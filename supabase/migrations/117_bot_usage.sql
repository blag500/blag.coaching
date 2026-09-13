-- 117_bot_usage.sql
-- Колко струва ботът, мерено вместо предполагано.
--
-- Николай реши да не слагаме таван на въпросите, а да гледаме разхода и да го
-- мислим, когато стане дебело. Само че „гледаме разхода" дотук значеше да се
-- отвори таблото на Groq и да се види едно общо число — без да се знае кое го
-- е направило: отговорите, разчитането на изреченията, преводът за търсенето,
-- нощната обиколка или свиването на паметта.
--
-- Тук всяко обръщение към модела си оставя ред: кой, за какво, с кой модел и
-- колко знака е струвало. Оттам се вижда кое поскъпва, преди сметката да го
-- каже — а и кое си струва парите.
--
-- Редовете са евтини (един на обръщение, тоест няколко на въпрос) и се трият
-- сами след два месеца: това е мерило за тенденция, не архив.

create table if not exists public.bot_usage (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  -- За какво е било обръщението: 'answer', 'extract', 'translate',
  -- 'watch', 'distill', 'title'.
  kind       text not null,
  model      text,
  prompt_tokens     int,
  completion_tokens int,
  total_tokens      int
);

create index if not exists bot_usage_time_idx on public.bot_usage (created_at desc);
create index if not exists bot_usage_kind_idx on public.bot_usage (kind, created_at desc);

alter table public.bot_usage enable row level security;

-- Нито едно правило: пише се само със сервизния ключ, чете се само оттам и от
-- таблото. Разходът е на собственика на проекта, не на клиента.
drop policy if exists "bot_usage_none" on public.bot_usage;

-- Чистене: два месеца стигат, за да се види посока.
create or replace function public.prune_bot_usage()
returns void
language sql
as $$
  delete from public.bot_usage where created_at < now() - interval '60 days';
$$;

select cron.unschedule('prune-bot-usage') where exists (
  select 1 from cron.job where jobname = 'prune-bot-usage'
);

select cron.schedule('prune-bot-usage', '17 3 * * 1', $$select public.prune_bot_usage()$$);
