alter table public.sleep_logs
  add column if not exists hydration_glasses smallint,
  add column if not exists stress  smallint check (stress  between 1 and 5),
  add column if not exists energy  smallint check (energy  between 1 and 5),
  add column if not exists soreness smallint check (soreness between 1 and 5),
  add column if not exists mood    smallint check (mood    between 1 and 5);
