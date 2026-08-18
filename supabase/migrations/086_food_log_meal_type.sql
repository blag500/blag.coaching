-- ============================================================
-- 086_food_log_meal_type.sql — which meal a logged food belongs to
-- Run in the Supabase SQL Editor (or via MCP).
--
-- Splits the day's log into breakfast / lunch / dinner / snack. Nullable, so
-- every row written before this — and any insert that doesn't say — stays valid
-- and simply reads as unassigned. This is also the grain Благ Бот will read the
-- day on, so the value is a small closed set rather than free text.
-- ============================================================

alter table public.food_logs
  add column if not exists meal_type text
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'));

-- The log is always read one user + one day at a time; the meal split is a
-- grouping within that, so the existing (user_id, date) access path already
-- covers it and no new index is needed.
