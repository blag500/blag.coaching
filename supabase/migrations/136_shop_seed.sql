-- Стартовият асортимент на онлайн магазина (21.10.2026).
-- Генерирано от D:\blag-ai\shop\build_products.py — не се пипа на ръка.

insert into public.shop_products (id, category, name, size_label, price_cents, image, description, flavors, sort, active) values
  ('core-champs-whey-2270', 'protein', 'Core Champs 100% Whey', '2270 г · 66 дози', 6549, '/shop/img/core-champs-whey-2270.webp', 'Суроватъчен протеин, ултрафилтриран. Голямата опаковка — най-ниската цена на доза в магазина.', array['Бисквити с крем','Ванилия','Карамел-Капучино','Малина с йогурт','Манго','Неаполитански сладолед','Тофи - Карамел']::text[], 0, true),
  ('la-whey-1000', 'protein', 'Lazar Angelov LA Whey', '1000 г · 33 дози', 3349, '/shop/img/la-whey-1000.webp', 'Суроватъчен концентрат на българската марка на Лазар Ангелов.', array['Ванилия']::text[], 1, true),
  ('dennis-james-whey-2000', 'protein', 'Dennis James Whey Matrix', '2000 г · 57 дози', 6749, '/shop/img/dennis-james-whey-2000.webp', 'Суроватъчен концентрат (WPC), 100 %.', array['Шоколад']::text[], 2, true),
  ('yava-pure-iso-1000', 'protein', 'Yava Labs Pure Iso Whey', '1000 г · 33 дози', 5199, '/shop/img/yava-pure-iso-1000.webp', 'Суроватъчен изолат — повече протеин и по-малко лактоза на доза от концентрата.', array['Банан','Бисквити с крем','Ванилов сладолед','Шоколад - Тофифи','Шоколадов сладолед','Ягода']::text[], 3, true),
  ('yava-vegan-2000', 'protein', 'Yava Labs Vegan Protein', '2000 г · 66 дози', 5099, '/shop/img/yava-vegan-2000.webp', 'Растителен протеин от грах и мая. Без мляко.', array['Банан','Солен карамел','Шоколадов сладолед','Ягода']::text[], 4, true),
  ('6pak-creatine-300', 'creatine', '6PAK Creatine Monohydrate', '300 г · 50 дози', 1349, '/shop/img/6pak-creatine-300.webp', 'Креатин монохидрат — най-изследваната добавка за сила.', array['Грейпфрут','Лимон','Неовкусен','Портокал','Ябълка']::text[], 5, true),
  ('6pak-creatine-500', 'creatine', '6PAK Creatine Monohydrate', '500 г · 83 дози', 1999, '/shop/img/6pak-creatine-500.webp', 'Креатин монохидрат — най-изследваната добавка за сила.', array['Грейпфрут','Портокал','Ябълка']::text[], 6, true),
  ('levrone-crea-1000', 'creatine', 'Kevin Levrone Crea+', '1000 г · 200 дози', 3649, '/shop/img/levrone-crea-1000.webp', 'Креатин монохидрат с магнезий и витамин B6.', array['Касис','Неовкусен']::text[], 7, true),
  ('ostrovit-eaa-600', 'amino', 'OstroVit EAA', '600 г · 60 дози', 2449, '/shop/img/ostrovit-eaa-600.webp', 'Есенциалните аминокиселини — деветте, които тялото не произвежда само.', array['Грейпфрут','Неовкусен','Портокал','Ягода']::text[], 8, true),
  ('6pak-citrulline-450', 'preworkout', '6PAK Citrulline', '450 г · 150 дози', 2699, '/shop/img/6pak-citrulline-450.webp', 'L-цитрулин на прах — за помпа и издръжливост в тренировката.', array['Грейпфрут','Лимон']::text[], 9, true),
  ('fa-ice-pump-463', 'preworkout', 'FA Nutrition Ice Pump', '463 г · 100 дози', 3749, '/shop/img/fa-ice-pump-463.webp', 'Предтренировъчна формула.', array['Icy Citrus & Peach','Icy Dragon Fruit','Icy Lychee','Icy Mango & Passion Fruit']::text[], 10, true),
  ('6pak-beta-alanine-200', 'preworkout', '6PAK Beta-Alanine', '200 г', 899, '/shop/img/6pak-beta-alanine-200.webp', 'Бета-аланин на прах — за серии с повече повторения.', array['Неовкусен']::text[], 11, true),
  ('essensey-caffeine-120', 'preworkout', 'Essensey Caffeine 200 mg', '120 капсули', 949, '/shop/img/essensey-caffeine-120.webp', 'Кофеин, 200 mg в капсула. Без вкус, без захар, точна доза.', '{}'::text[], 12, true),
  ('nutriversum-d3k2-120', 'vitamins', 'Nutriversum D3 1000 + K2', '120 капсули', 799, '/shop/img/nutriversum-d3k2-120.webp', 'Витамин D3 1000 IU с K2 75 mcg. Една капсула на ден.', '{}'::text[], 13, true),
  ('6pak-zinc-120', 'vitamins', '6PAK Zinc 15 mg', '120 капсули', 799, '/shop/img/6pak-zinc-120.webp', 'Цинк, 15 mg в капсула.', '{}'::text[], 14, true),
  ('allnutrition-mg-citrate-100', 'vitamins', 'AllNutrition Magnesium Citrate + B6', '100 капсули', 599, '/shop/img/allnutrition-mg-citrate-100.webp', 'Магнезиев цитрат с витамин B6.', '{}'::text[], 15, true),
  ('myprotein-alpha-men-120', 'vitamins', 'MyProtein Alpha Men', '120 таблетки', 849, '/shop/img/myprotein-alpha-men-120.webp', 'Мултивитамин за мъже.', '{}'::text[], 16, true),
  ('ostrovit-ashwagandha-90', 'vitamins', 'OstroVit Ashwagandha 375 mg', '90 таблетки', 649, '/shop/img/ostrovit-ashwagandha-90.webp', 'Екстракт от ашваганда, 375 mg.', '{}'::text[], 17, true),
  ('allnutrition-omega3-90', 'vitamins', 'AllNutrition Omega 3 1000', '90 капсули', 1099, '/shop/img/allnutrition-omega3-90.webp', 'Рибено масло, 1000 mg в капсула.', '{}'::text[], 18, true),
  ('applied-electrolyte-20', 'electrolytes', 'Applied Nutrition Electrolyte', '20 ефервесцентни таблетки', 749, '/shop/img/applied-electrolyte-20.webp', 'Електролити в таблетка, която се разтваря във вода.', array['Горски плодове','Лимон и лайм','Портокал','Розов грейпфрут']::text[], 19, true),
  ('ostrovit-electrolytes-270', 'electrolytes', 'OstroVit Pure Electrolytes', '270 г · 90 дози', 999, '/shop/img/ostrovit-electrolytes-270.webp', 'Електролити на прах, без захар.', array['Неовкусен']::text[], 20, true),
  ('mhn-muffin', 'snacks', 'MHN Protein Muffin', '50 г', 249, '/shop/img/mhn-muffin.webp', 'Протеинов мъфин без добавена захар.', array['Ванилия','Шоколад']::text[], 21, true),
  ('bw-boost-bar', 'snacks', 'Born Winner Boost бар', '55 г · 31 % протеин', 199, '/shop/img/bw-boost-bar.webp', 'Протеинов бар, 31 % протеин.', array['Бананов млечен шейк','Шоколадов трюфел']::text[], 22, true),
  ('bw-core-bar', 'snacks', 'Born Winner Core бар', '57 г · 35 % протеин', 249, '/shop/img/bw-core-bar.webp', 'Протеинов бар, 35 % протеин.', array['Бисквити с карамел']::text[], 23, true),
  ('riceup-collagen-bar', 'snacks', 'RiceUP! Колагенов протеинов бар', '50 г', 199, '/shop/img/riceup-collagen-bar.webp', 'Протеинов бар с колаген.', array['Банан','Кокос','Малина','Портокал','Тофи Карамел','Троен шоколад','Фъстъчено масло','Шамфъстък','Шоко Ванилия']::text[], 24, true),
  ('riceup-protein-chips', 'snacks', 'RiceUP! Протеинов чипс', '60 г', 199, '/shop/img/riceup-protein-chips.webp', 'Печен чипс с протеин.', array['Барбекю','Морска сол','Паприка','Пармезан','Сметана и Билки']::text[], 25, true),
  ('riceup-rice-bar', 'snacks', 'RiceUP! Оризов бар Zero Sugar', 'пълнозърнест кафяв ориз', 99, '/shop/img/riceup-rice-bar.webp', 'Оризов бар без добавена захар.', array['']::text[], 26, true),
  ('fitspo-flapjack', 'snacks', 'FitSpo Флапджак', '80 г', 199, '/shop/img/fitspo-flapjack.webp', 'Овесен енергиен бар.', array['']::text[], 27, true)
on conflict (id) do update set category = excluded.category, name = excluded.name, size_label = excluded.size_label,
  price_cents = excluded.price_cents, image = excluded.image, description = excluded.description,
  flavors = excluded.flavors, sort = excluded.sort, updated_at = now();

-- Цените на едро (shop_supply) не са тук: repo-то е публично. Те са в
-- D:\blag-ai\shop\supply.sql и в базата.
