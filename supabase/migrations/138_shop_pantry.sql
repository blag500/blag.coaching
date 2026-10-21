-- 138_shop_pantry.sql — храна за готвене в магазина (22.10.2026).
--
-- Николай: „разшири гамата от наличните дистрибутори — от Promoto и Metro,
-- от типа оризов грис, какао, овес, подсладител, с макроси като за meal
-- prep“. Това обръща част от Р16 (общите храни бяха отхвърлени) — виж
-- DECISIONS.md, Р16, допълнението от 22.10.
--
--   category 'pantry' — „За готвене“: грис, овес, ориз, какао, подсладители…
--   per100  — макросите на 100 г по етикета: {kcal, protein, carbs, fat, source}
--   net_g   — грамовете в опаковката; цена на кг = цена / net_g * 1000
--
-- Цените на едро са в shop_supply, пишат се отделно и не са в това хранилище.

alter table public.shop_products drop constraint if exists shop_products_category_check;
alter table public.shop_products add constraint shop_products_category_check check (category in
  ('protein', 'creatine', 'amino', 'preworkout', 'vitamins', 'electrolytes', 'snacks', 'pantry'));

alter table public.shop_products
  add column if not exists per100 jsonb,
  add column if not exists net_g integer;
