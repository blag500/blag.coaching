-- One row per set, not one per exercise.
--
-- A session was stored as a single row carrying "sets: 4", which meant the
-- four sets had to be identical — there was nowhere to say that the first was
-- 80×10 and the last 80×6, which is the shape almost every real set of four
-- actually has. Without an index the rows are also indistinguishable from each
-- other, so an edit could not be aimed at one of them.
alter table public.exercise_logs
  add column if not exists set_index integer;

-- Existing rows are a whole exercise rather than one set; leaving set_index
-- null marks them as such, and the app treats null as "the old shape".
create index if not exists exercise_logs_user_date_ex_idx
  on public.exercise_logs (user_id, date, exercise_name);
