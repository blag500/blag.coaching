-- 100_task_time.sql — Час и продължителност на задачата.
--
-- Задачите пазеха само дата. „Днес" е достатъчно за списък, но не и за
-- времева линия: за да се начертае блок, трябва да се знае откъде започва и
-- колко трае.
--
-- `time`, не `timestamptz`. Задачата е в деня на човека — „тренировка в 18:00"
-- значи шест часа вечерта там, където той стои, а не момент в световното
-- време. С timestamptz едно пътуване до друга часова зона би разместило целия
-- му планер, което е точно обратното на това, което той е записал.
--
-- И двете са незадължителни: задача без час си остава редови запис в списъка
-- и просто не се появява на линията.

alter table public.tasks
  add column if not exists start_time   time,
  add column if not exists duration_min integer;

-- Долната граница е една минута; горната е денонощие. Задача, която трае
-- отрицателно време, е грешка при вписване, а не намерение.
alter table public.tasks drop constraint if exists tasks_duration_sane;
alter table public.tasks add constraint tasks_duration_sane check (
  duration_min is null or (duration_min between 1 and 1440)
);

-- Линията пита „кои задачи има този човек на този ден" и ги подрежда по час.
create index if not exists tasks_day_idx
  on public.tasks (user_id, due_date, start_time);
