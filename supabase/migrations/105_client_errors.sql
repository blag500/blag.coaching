-- 105_client_errors.sql
-- Счупеното стига до треньора, а не до конзолата на телефона.
--
-- Дотук ErrorBoundary рисуваше картичка и пишеше в конзолата, а console.error
-- стои на двайсет места в кода. Конзолата на телефон никой не я отваря —
-- значи всяко счупване при клиент е невидимо, докато той не се сети да пише.
-- Оттук нататък редът пристига сам.
--
-- Само вкарване и само свои редове: човек не чете чуждите грешки, а и не може
-- да прати ред от чуждо име. Треньорът чете всичко — той е този, който ще ги
-- поправя.

create table if not exists public.client_errors (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Какво е гръмнало.
  message     text not null,
  -- Къде: разделът, на който е стоял човекът, и адресът.
  screen      text,
  path        text,
  -- С какво: версия на приложението и низът на браузъра. Без тях един и същ
  -- ред от двама души е неразличим, а най-често вината е в единия телефон.
  app_version text,
  agent       text,
  -- Стекът, отрязан. Цял стек от минифициран код е стена, а първите редове
  -- казват същото.
  stack       text
);

create index if not exists client_errors_created_idx
  on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

drop policy if exists "client_errors_insert" on public.client_errors;
drop policy if exists "client_errors_select" on public.client_errors;

create policy "client_errors_insert" on public.client_errors
  for insert with check (auth.uid() = user_id);

create policy "client_errors_select" on public.client_errors
  for select using (auth.uid() = user_id or get_my_role() = 'coach');
