-- Adds structured daily/weekly check-in fields to form_checkins
alter table public.form_checkins
  add column if not exists sleep_hours      numeric(4, 1) check (sleep_hours between 0 and 24),
  add column if not exists gym_performance  smallint      check (gym_performance between 0 and 2),
  add column if not exists training_desire  smallint      check (training_desire between 0 and 5),
  add column if not exists weekly_win       text,
  add column if not exists weekly_improve   text;
