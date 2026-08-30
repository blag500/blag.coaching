-- Категорията и нейният лимит.
--
-- Пиковата седмица качва тегло нарочно: зареждането слага два-три килограма за
-- три дни. При категория с таван това е разликата между да излезеш и да те
-- претеглят извън класа — а източникът се връща към „weight class athlete"
-- на всеки завой именно защото сметките там са други.
--
-- Лимитът се въвежда, не се изчислява. Таблиците по височина се различават по
-- федерация и по година; приложението няма да ги гадае, а числото, което
-- треньорът знае, е точно.
alter table public.peak_weeks
  add column if not exists division      text,
  add column if not exists weight_limit  numeric(5, 2) check (weight_limit between 30 and 200),
  add column if not exists division_notes text;

comment on column public.peak_weeks.weight_limit is
  'Таван на теглото за категорията, в килограми. Null значи категория без таван.';
