-- 093_checkin_v2.sql — Седмичният чекин става чекин.
--
-- Дотук form_checkins беше шест полета: тегло, сън, представяне, желание,
-- победа, подобрение. Това е дневник на настроението, не чекин.
--
-- Водещият принцип при разширяването: питаме само онова, което приложението
-- не може да знае. Теглото го има в weight_logs всяка сутрин, седмиците до
-- състезанието ги смята протоколът, тренировките ги знае exercise_logs, сънят
-- е в sleep_logs. Да караш човек да си препише теглото в събота е и излишно, и
-- по-лошо от данните, които вече имаш: едно самоотчетено число се нагласява,
-- средната от седем мерения — не.
--
-- Затова новите колони са само две неща: субективното, което живее единствено
-- в главата на човека, и мереното вкъщи, за което няма откъде другаде да дойде.

alter table public.form_checkins
  -- Кога е подаден. `date` е за кой ден е чекинът; това е кога е натиснато —
  -- разликата между „дължа чекин" и „подадох го със закъснение".
  add column if not exists submitted_at timestamptz,

  -- ── Субективното ──────────────────────────────────────────────────
  -- Скалите са с посока, и посоката носи смисъл: глад нагоре е тревога,
  -- стрес нагоре е тревога, енергия надолу е тревога. Едно и също „↑" не
  -- значи едно и също нещо на два реда, и екранът трябва да го знае.
  add column if not exists hunger        smallint check (hunger between 1 and 5),
  add column if not exists stress        smallint check (stress between 1 and 10),
  -- Наследява training_desire (0–5), който остава заради старите записи, но
  -- вече не се пише. Десет степени, защото на пет човек избира средата.
  add column if not exists energy        smallint check (energy between 1 and 10),
  -- Посоката на силата е gym_performance (0 надолу, 1 задържа, 2 нагоре) —
  -- колоната вече я има. Тук е обяснението към нея: „задържах, лек спад на
  -- бутането" носи повече от която и да е стрелка.
  add column if not exists strength_note text,
  add column if not exists issues        text,   -- стави, връзки, връзка с мускула
  add column if not exists digestion     text,
  add column if not exists cycle_on      boolean,

  -- ── Мереното вкъщи ────────────────────────────────────────────────
  add column if not exists glucose       smallint check (glucose between 20 and 500),
  add column if not exists bp_systolic   smallint check (bp_systolic between 50 and 260),
  add column if not exists bp_diastolic  smallint check (bp_diastolic between 30 and 200),
  add column if not exists resting_hr    smallint check (resting_hr between 25 and 200),
  add column if not exists waist_cm      numeric(5, 1) check (waist_cm between 30 and 250),
  add column if not exists caliper_1     numeric(4, 1) check (caliper_1 between 0 and 100),
  add column if not exists caliper_2     numeric(4, 1) check (caliper_2 between 0 and 100),
  add column if not exists caliper_3     numeric(4, 1) check (caliper_3 between 0 and 100),
  add column if not exists steps_avg     integer       check (steps_avg between 0 and 100000),

  -- ── Снимките ──────────────────────────────────────────────────────
  -- Карта поза → адрес: { "front_relaxed": "https://…", "back_double": "…" }.
  -- Фиксирани гнезда, а не списък, защото сравнението седмица-до-седмица е
  -- смисълът: същата поза, два записа, едно до друго. Списък от снимки
  -- изисква някой да ги подрежда наум всеки път.
  -- photo_url остава: старите чекини имат по една снимка и тя не се хвърля.
  add column if not exists photos        jsonb not null default '{}'::jsonb,

  -- Каквото треньорът реши да пита извън горното. Типизираните колони хранят
  -- графиките; това храни гъвкавостта. Двете не се заместват.
  add column if not exists extra         jsonb not null default '{}'::jsonb,

  -- Какво знаеше приложението за тази седмица, снимано в мига на подаването:
  -- средно тегло от мереното, тренировки, дни с логнато хранене, сън, навици,
  -- седмици до състезанието. Записва се, вместо да се смята наново при всяко
  -- отваряне — не заради бързина, а заради истината: седмица, гледана след
  -- три месеца, трябва да показва каквото е било тогава, а логовете се
  -- редактират със задна дата.
  add column if not exists auto          jsonb not null default '{}'::jsonb;

-- Денят на чекина. Ритуал без ден е молба; ритуал с ден е ритуал.
-- 0 = понеделник, 6 = неделя. Null значи „както се сети" — старото поведение.
alter table public.profiles
  add column if not exists checkin_day smallint check (checkin_day between 0 and 6);

-- Треньорът чете чекините. Дотук единствената политика беше „всичко за
-- собственика" — панелът показваше чекини, защото треньорът така или иначе
-- ги четеше с ключа на приложението, но правото не беше записано никъде.
-- Същият модел като при profiles: един треньор, вижда всички.
do $$ begin
  create policy "Coach reads check-ins"
    on public.form_checkins for select
    using (auth.uid() = user_id or get_my_role() = 'coach');
exception when duplicate_object then null;
end $$;

create index if not exists form_checkins_user_date_desc_idx
  on public.form_checkins (user_id, date desc);
