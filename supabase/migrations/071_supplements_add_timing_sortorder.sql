-- 071: Add timing and sort_order to supplements table
-- Safe to run regardless of whether 026 or 069 was run first.
-- add column if not exists means it's idempotent.

alter table public.supplements
  add column if not exists timing     text,
  add column if not exists sort_order int not null default 0;
