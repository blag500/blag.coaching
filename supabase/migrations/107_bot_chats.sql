-- 107_bot_chats.sql
-- Разговорите стават нишки.
--
-- Дотук всичко казано на бота лежеше в една купчина и се четеше като един
-- безкраен разговор: осемте последни реплики влизаха обратно в подканата,
-- независимо дали са от днешния въпрос за водата или от миналоседмичния спор
-- за въглехидратите. Човек, който пита за две различни неща, получава отговор,
-- забъркан от двете.
--
-- Оттук нататък всеки разговор е нишка със свое начало и свое заглавие, а
-- списъкът им стои на страницата на бота.

create table if not exists public.bot_chats (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Заглавието е първият въпрос, отрязан. Не се иска от човека и не се мисли
  -- от модел: разговорът се разпознава по това, с което е започнал.
  title      text
);

create index if not exists bot_chats_user_idx
  on public.bot_chats (user_id, updated_at desc);

-- Старите реплики остават без нишка и продължават да се четат: null значи
-- „отпреди разделянето", а не „счупено".
alter table public.bot_messages
  add column if not exists chat_id uuid references public.bot_chats(id) on delete cascade;

create index if not exists bot_messages_chat_idx
  on public.bot_messages (chat_id, created_at);

alter table public.bot_chats enable row level security;

drop policy if exists "bot_chats_own" on public.bot_chats;

create policy "bot_chats_own" on public.bot_chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
