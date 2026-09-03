-- 099_exercise_library.sql — Заготовките за упражнения.
--
-- Заместването го има от самото начало: молив на всеки ред в дневника, в който
-- се пише име. Но е свободен текст и се пише всеки път наново — оттам идват
-- „Лежанка", „лежанка" и „Лежанка с дъмбели" като три различни упражнения за
-- статистиката. И заместителят живее в localStorage за деня, тоест на един
-- телефон.
--
-- Тук стои списъкът, от който се избира вместо да се пише. Един ред е едно
-- упражнение; `folder` е папката, в която стои („Заместители за гърди"), и е
-- само подреждане — при избиране се взима едно упражнение, не цялата папка.
--
-- Списъкът е на клиента. Треньорът дава програмата; какво слагаш, когато
-- уредът е зает, е твое решение и не бива да чака одобрение.

create table if not exists public.exercise_library (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 80),
  -- Папката е свободен текст, а не отделна таблица: тя е етикет, по който се
  -- групира списък от десетина реда, и таблица за това би била чиния за едно
  -- зърно ориз. Празно значи „без папка".
  folder      text check (folder is null or length(btrim(folder)) <= 40),
  -- Каквото планът би написало: „3 × 8–10". Свободен текст, защото такъв е и
  -- в самия план — минути, повторения и „до отказ" не се побират в число.
  scheme      text check (scheme is null or length(scheme) <= 40),
  -- Мускулната група, ако човекът я е посочил. Същата ос, по която върви
  -- часовникът за възстановяване; null значи „не е казано".
  muscle      text check (muscle is null or length(muscle) <= 20),
  created_at  timestamptz not null default now()
);

-- Едно и също име два пъти в един списък е грешка на пръста, не намерение.
-- Без значение на регистъра, както е и при краткото име.
create unique index if not exists exercise_library_name_key
  on public.exercise_library (user_id, lower(btrim(name)));

create index if not exists exercise_library_user_idx
  on public.exercise_library (user_id, folder);

alter table public.exercise_library enable row level security;

-- Един собственик, четири правила. Треньорът нарочно не е изключение: това е
-- личният списък на човека, а не част от програмата, която той дава.
do $$ begin
  create policy "Всеки вижда своя списък"
    on public.exercise_library for select
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Пише се само в своя списък"
    on public.exercise_library for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Поправя се само своят списък"
    on public.exercise_library for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Трие се само от своя списък"
    on public.exercise_library for delete
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;
