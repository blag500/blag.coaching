-- 075_food_history.sql
-- A real food history, not a peek at the last 200 log rows.
--
-- RecentMode read the newest 200 entries and de-duplicated them client-side, so
-- anything not eaten for a couple of months silently fell out of the list. This
-- collapses the whole log to one row per food, keeping the most recent portion
-- and macros, and counting how often it has been eaten.

create or replace function public.food_history(search text default null)
returns table (
  name       text,
  grams      numeric,
  kcal       integer,
  protein    numeric,
  carbs      numeric,
  fat        numeric,
  times_used bigint,
  last_used  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (lower(f.name))
      f.name, f.grams, f.kcal, f.protein, f.carbs, f.fat, f.added_at
    from public.food_logs f
    where f.user_id = auth.uid()
      and (search is null or search = '' or f.name ilike '%' || search || '%')
    order by lower(f.name), f.added_at desc
  ),
  counts as (
    select lower(f.name) as key, count(*) as n, max(f.added_at) as last_at
    from public.food_logs f
    where f.user_id = auth.uid()
    group by lower(f.name)
  )
  select l.name, l.grams, l.kcal, l.protein, l.carbs, l.fat,
         c.n as times_used, c.last_at as last_used
  from latest l
  join counts c on c.key = lower(l.name)
  order by c.last_at desc
$$;

grant execute on function public.food_history(text) to authenticated;

-- Rename a food everywhere it appears, so a typo fixed once stays fixed.
create or replace function public.rename_food(old_name text, new_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if new_name is null or btrim(new_name) = '' then
    raise exception 'new_name must not be empty';
  end if;

  update public.food_logs
  set name = btrim(new_name)
  where user_id = auth.uid()
    and lower(name) = lower(old_name);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.rename_food(text, text) to authenticated;

-- Forget a food entirely — removes every log entry with that name.
create or replace function public.forget_food(food_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  delete from public.food_logs
  where user_id = auth.uid()
    and lower(name) = lower(food_name);

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.forget_food(text) to authenticated;

-- The history query filters and sorts on these two columns for one user.
create index if not exists food_logs_user_added_idx
  on public.food_logs (user_id, added_at desc);

create index if not exists food_logs_user_name_idx
  on public.food_logs (user_id, lower(name));
