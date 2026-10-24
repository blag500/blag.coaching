-- 142 — десет добавки от Fitness1 (24.10.2026): качествена форма, 5 % под пазара, марж над 25 %.
-- Изборът: D:\blag-ai\shop\data\pazar-2026-10-24.csv. Генерирано от D:\blag-ai\shop\add_2026_10_24.py.
-- AllNutrition Omega 3 излиза: Hero.Lab Ultra Omega дава повече EPA/DHA на капсула.

insert into public.shop_products (id, category, name, size_label, price_cents, image, description, flavors,
  sort, active, goals, servings, serving_unit, tags) values
  ('applied-clear-whey-875', 'protein', 'Applied Nutrition Clear Whey', '875 г · 35 дози', 5999, '/shop/img/applied-clear-whey-875.webp', 'Хидролизиран суроватъчен изолат, който се пие бистър като сок, а не като млечен шейк.', array['Ягода с лайм']::text[], 40, true, array['strength','recovery']::text[], 35, 'доза', '{}'::text[]),
  ('applied-creatine-1000', 'creatine', 'Applied Nutrition Creatine Monohydrate', '1000 г · 200 дози', 4249, '/shop/img/applied-creatine-1000.webp', 'Креатин монохидрат на прах, без вкус. Голямата опаковка — 200 дози.', array['Неовкусен']::text[], 41, true, array['strength']::text[], 200, 'доза', '{}'::text[]),
  ('nutriversum-eaa-flow-500', 'amino', 'Nutriversum EAA Flow', '500 г · 83 дози', 2649, '/shop/img/nutriversum-eaa-flow-500.webp', 'Деветте есенциални аминокиселини на прах.', array['Ябълка']::text[], 42, true, array['recovery']::text[], 83, 'доза', '{}'::text[]),
  ('ostrovit-d3k2-drops-30', 'vitamins', 'OstroVit D3 + K2 MK-7 капки', '30 мл', 1399, '/shop/img/ostrovit-d3k2-drops-30.webp', 'Витамин D3 и K2 (MK-7) в капки. Най-ниската цена на доза за D3 в магазина.', '{}'::text[], 43, true, array['health']::text[], 1044, 'доза', '{}'::text[]),
  ('herolab-ultra-omega-90', 'vitamins', 'Hero.Lab Ultra Omega', '90 капсули', 2549, '/shop/img/herolab-ultra-omega-90.webp', 'Рибено масло с 500 mg EPA и 250 mg DHA в капсула.', '{}'::text[], 44, true, array['health','recovery']::text[], 90, 'доза', '{}'::text[]),
  ('herolab-omega3-120', 'vitamins', 'Hero.Lab Omega-3 65 %', '120 капсули', 1849, '/shop/img/herolab-omega3-120.webp', 'Рибено масло, 65 % от което са EPA и DHA.', '{}'::text[], 45, true, array['health','recovery']::text[], 120, 'доза', '{}'::text[]),
  ('trec-ksm66-60', 'vitamins', 'Trec Ashwagandha KSM-66 200 mg', '60 капсули', 1399, '/shop/img/trec-ksm66-60.webp', 'Екстракт от корен на ашваганда KSM-66, 200 mg в капсула.', '{}'::text[], 46, true, array['health']::text[], 60, 'доза', '{}'::text[]),
  ('nutriversum-collagen-200', 'vitamins', 'Nutriversum Collagen Peptides', '200 г · 20 дози', 1499, '/shop/img/nutriversum-collagen-200.webp', 'Хидролизиран колаген на прах, без вкус — разтваря се във вода или кафе.', array['Неовкусен']::text[], 47, true, array['health','recovery']::text[], 20, 'доза', '{}'::text[]),
  ('ostrovit-pro60-60', 'vitamins', 'OstroVit PRO-60 BIOTIC', '60 капсули', 1049, '/shop/img/ostrovit-pro60-60.webp', 'Пробиотик с LactoSpore® — спорообразуващият щам Bacillus coagulans.', '{}'::text[], 48, true, array['health']::text[], 60, 'доза', '{}'::text[]),
  ('6pak-glycine-200', 'amino', '6PAK Glycine', '200 г · 200 дози', 749, '/shop/img/6pak-glycine-200.webp', 'Глицин на прах с витамин B6, без вкус. Доза — 1 г.', array['Неовкусен']::text[], 49, true, array['health','recovery']::text[], 200, 'доза', '{}'::text[])
on conflict (id) do update set category = excluded.category, name = excluded.name, size_label = excluded.size_label,
  price_cents = excluded.price_cents, image = excluded.image, description = excluded.description,
  flavors = excluded.flavors, sort = excluded.sort, active = true, goals = excluded.goals,
  servings = excluded.servings, updated_at = now();

update public.shop_products set active = false, updated_at = now() where id in ('allnutrition-omega3-90');

-- Цените на едро не са тук: repo-то е публично (D:\blag-ai\shop\supply-2026-10-24.sql).
