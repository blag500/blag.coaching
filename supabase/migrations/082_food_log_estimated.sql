-- Which numbers were read, and which were guessed.
--
-- Three routes into the food log end in a model's reading rather than a label:
-- a typed description, a photographed label, a photographed plate. They arrive
-- in the same fields as a scanned barcode and look exactly as certain, so once
-- the entry is saved there is nothing left to say which was which.
--
-- That matters most for the person who did not enter it. The coach reads the
-- day as fact and adjusts a plan on it; a client rebuilding a week from their
-- own log deserves to know which lines are worth re-checking. A warning shown
-- only at the moment of entry answers neither.
--
-- Null means it was not recorded — every row that already exists, and anything
-- entered by hand from a package.
alter table public.food_logs
  add column if not exists estimated boolean;

comment on column public.food_logs.estimated is
  'true when the macros came from a model rather than a label or barcode';
