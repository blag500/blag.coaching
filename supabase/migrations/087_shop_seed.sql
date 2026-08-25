-- 087_shop_seed.sql
--
-- First real catalog for the shop tab. Focus per Nikolay's brief: not drinks,
-- not sandwiches — supplements, sweeteners, cocoa, protein powders, and the
-- unique dairy items the suppliers around him can hit next-day. Nikolay
-- delivers personally in Sofia at the start, so the checkout stays local and
-- these are the SKUs he keeps stocked at home.
--
-- Prices are in stotinki (BGN × 100). Kept close to Retail figures from the
-- supplier notes in the second brain (2026-08 pricing) with room to nudge
-- once real orders start settling.
--
-- Rerunnable via `on conflict do update` on name — a rename or a price
-- change should overwrite, not duplicate. Adds a unique constraint on name
-- if the table doesn't have one yet.

-- ── Category values used by the app UI (087):
--    protein_powder | bars | cookies | cocoa | supplements | sweeteners | dairy

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'catalog_products_name_unique'
  ) then
    alter table public.catalog_products
      add constraint catalog_products_name_unique unique (name);
  end if;
end $$;

insert into public.catalog_products
  (name, description, price_stotinki, category, kcal_per_serving,
   protein_per_serving, carbs_per_serving, fat_per_serving,
   serving_size, serving_unit, available, sort_order)
values
  -- ── Протеин на прах ────────────────────────────────────────────────
  ('Born Winner Whey Дойпак 810g — шоколад',
   'Whey blend, около 27 порции. За вкъщи, не за път.',
   8799, 'protein_powder', 118, 24, 2, 1.5, 30, 'g', true, 10),

  ('Born Winner Whey саше 30g',
   'Единична доза за път или за проба на вкус. Разбъркваш в шейкър или в мляко.',
   429, 'protein_powder', 118, 24, 2, 1.5, 30, 'g', true, 11),

  ('FitSpo Whey Bag 908g — солен карамел',
   'Whey isolate + concentrate blend, ~30 порции. Без палмово масло, без добавена захар.',
   9799, 'protein_powder', 120, 25, 2, 1.5, 30, 'g', true, 12),

  ('FitSpo Whey саше 30g',
   'Единична доза, четири вкуса. Ягода / ванилия / солен карамел / кокос.',
   389, 'protein_powder', 120, 25, 2, 1.5, 30, 'g', true, 13),

  -- ── Барове ─────────────────────────────────────────────────────────
  ('Born Winner Бууст 55g',
   'Стандартен протеинов бар за 20+ г протеин на порция.',
   399, 'bars', 210, 20, 18, 6, 55, 'g', true, 20),

  ('Born Winner КЕТО 60g',
   'Нисковъглехидратен, за keto/low-carb дни.',
   549, 'bars', 230, 15, 5, 18, 60, 'g', true, 21),

  ('Born Winner Мега Про 85g',
   'Голяма порция, ~30 g протеин. Заместител на междинно хранене.',
   589, 'bars', 320, 30, 25, 10, 85, 'g', true, 22),

  ('FitBar CRUNCHY 25g — фъстъчено масло с карамел',
   'Хрупкав протеинов бар без палмово масло и добавена захар.',
   549, 'bars', 200, 25, 15, 7, 60, 'g', true, 23),

  ('FitSpo La Carb 25g — бисквита с крем',
   'Нисковъглехидратен, с крем; за keto/cut.',
   489, 'bars', 190, 25, 5, 8, 55, 'g', true, 24),

  -- ── Куки / бисквити ───────────────────────────────────────────────
  ('Born Winner Куки Актив 75g',
   'Мек протеинов кукис за път или преди тренировка.',
   489, 'cookies', 280, 20, 25, 10, 75, 'g', true, 30),

  ('Born Winner Куки Делукс 75g',
   'Кремообразен пълнеж, по-плътна текстура.',
   549, 'cookies', 300, 20, 27, 12, 75, 'g', true, 31),

  ('FitSpo Куки 20g — троен шоколад 70g',
   'Тройна шоколадова версия, 20 g протеин в 70 g куки.',
   529, 'cookies', 260, 20, 22, 9, 70, 'g', true, 32),

  ('Rawllin Balls — кайсия и киноа 48g',
   'Веган енергийни топки. Три вкуса — кайсия/киноа, кокос/годжи, боровинка/чиа.',
   289, 'cookies', 180, 6, 22, 7, 48, 'g', true, 33),

  -- ── Какао ─────────────────────────────────────────────────────────
  ('Д-р Йоткер какао Премиум 100g',
   'Пълномаслено какао на прах, за печене и напитки. Задължителен продукт.',
   249, 'cocoa', 34, 3, 1.5, 2, 10, 'g', true, 40),

  ('Д-р Йоткер какао нискомаслено 50g',
   'Нискомаслено какао. По-нисък мазнинен профил, същият шоколадов вкус.',
   129, 'cocoa', 28, 3, 3, 1, 10, 'g', true, 41),

  -- ── Добавки ───────────────────────────────────────────────────────
  ('Born Winner BCAA 8000 700ml',
   'Аминокиселини за трениращи по време на дълга сесия.',
   399, 'supplements', 10, 2, 0, 0, 100, 'ml', true, 50),

  ('Born Winner L-Carnitine 2000 700ml',
   'Течен L-carnitine за преди кардио или сутрин на гладно.',
   349, 'supplements', 5, 0, 0, 0, 100, 'ml', true, 51),

  -- ── Подсладители ──────────────────────────────────────────────────
  -- Стартовият ред засега няма конкретен избран SKU за подсладители;
  -- добави ги Николай ръчно от каталог мениджъра, когато реши бранд.
  --   (Стевия на прах / Ерититол / Xylitol / Ксело)

  -- ── Млечни (уникалните от Fivepi + топ Skyr от Promoto) ───────────
  ('Скир Exquisa натурален 400g',
   'Натурален исландски скир, ~65 g протеин в кутия. Взима се от Promoto.',
   269, 'dairy', 58, 12, 4, 0.2, 100, 'g', true, 60),

  ('Скир Exquisa без лактоза 400g',
   'Скир за хора с лактозна непоносимост. Same protein hit, no bloat.',
   229, 'dairy', 58, 12, 4, 0.2, 100, 'g', true, 61),

  ('KRI KRI протеинов йогурт 265g',
   'Гръцки протеинов йогурт с плод. Междинно хранене за път.',
   189, 'dairy', 90, 10, 8, 0.2, 100, 'g', true, 62),

  ('Сирене Котидж 4.7% 500g Балтайс',
   'Уникален продукт — ~65 g протеин в кутия. Fivepi.',
   329, 'dairy', 105, 13, 3, 4.7, 100, 'g', true, 63),

  ('Кефир с боровинки 125g',
   'Малка порция кефир, лек десерт. Fivepi.',
   139, 'dairy', 75, 4, 10, 2, 100, 'g', true, 64),

  ('Течен яйчен белтък 1L Balticovo',
   'Пастьоризиран, готов за омлет или шейк. Fivepi.',
   399, 'dairy', 50, 11, 1, 0, 100, 'ml', true, 65)

on conflict (name) do update set
  description         = excluded.description,
  price_stotinki      = excluded.price_stotinki,
  category            = excluded.category,
  kcal_per_serving    = excluded.kcal_per_serving,
  protein_per_serving = excluded.protein_per_serving,
  carbs_per_serving   = excluded.carbs_per_serving,
  fat_per_serving     = excluded.fat_per_serving,
  serving_size        = excluded.serving_size,
  serving_unit        = excluded.serving_unit,
  sort_order          = excluded.sort_order;
