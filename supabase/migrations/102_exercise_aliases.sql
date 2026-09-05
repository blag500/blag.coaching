-- 102_exercise_aliases.sql — Едно упражнение, писано по няколко начина.
--
-- Прогресията групира вписванията по `exercise_name`, точно както е написано.
-- Затова „Лежанка" в единия блок и „Лежанка с щанга" в другия дават две
-- отделни криви за едно и също движение — а осем седмици прогрес, разцепен на
-- две, не показва прогрес.
--
-- Тук стои казаното от човека: това е същото като онова. Ръчно, защото
-- автоматичното сливане по близко име рано или късно слепва наклонена и равна
-- лежанка — а сгрешено обединяване се забелязва месеци по-късно, когато
-- кривата вече е излъгала.
--
-- Псевдонимът не пипа вписванията. `exercise_logs` пази това, което е било
-- написано в деня; обединяването е поглед върху него и се маха с един ред.

create table if not exists public.exercise_aliases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- Както е написано в дневника.
  alias      text not null check (length(btrim(alias)) between 1 and 120),
  -- Името, в което се влива.
  canonical  text not null check (length(btrim(canonical)) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint exercise_aliases_not_self check (lower(btrim(alias)) <> lower(btrim(canonical)))
);

-- Едно име се влива най-много в едно друго. Без това „Лежанка" може да сочи
-- към две различни канонични имена и въпросът „коя е кривата" има два отговора.
create unique index if not exists exercise_aliases_alias_key
  on public.exercise_aliases (user_id, lower(btrim(alias)));

alter table public.exercise_aliases enable row level security;

do $$ begin
  create policy "Всеки вижда своите обединявания"
    on public.exercise_aliases for select
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Обединява само в своя дневник"
    on public.exercise_aliases for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Разединява само своето"
    on public.exercise_aliases for delete
    using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;
