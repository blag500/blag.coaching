-- 087_shop_seed.sql
--
-- Фаза 1: каталогът, който Николай продава — 3 категории засега.
-- Отпадат: НАПИТКИ (drinks), ГОТОВИ (sandwiches — Balkan Sandwiches +
-- млечните от Promoto), и Био Яйца от Harmonica.
--
-- Всеки продукт носи:
--   • wholesale_stotinki — цена на едро от доставчика (за твоята сметка)
--   • price_stotinki     — retail към клиента
--   • supplier            — от кого се взема (XFuel, Уинър Трейд, FitSpo,
--                           Harmonica)
--   • supplier_url        — линк към продукта в b2b (пълни се по-късно)
--
-- Rerunnable — `on conflict (name) do update` обновява без да дублира.
-- Разговорни цени в €: BGN = EUR × 1.9558 (фиксиран пег), rounded to
-- 5 stotinki увеличения.
--
-- Категории:
--   bars_snacks     — протеинови барове, куки, чипсове, флапджаци
--   pantry          — гранола, мюсли, тахани, ядки, вафли (Harmonica)
--   supplements     — whey powder и саше

-- ── Добавяме нужните колони ───────────────────────────────────────────
alter table public.catalog_products
  add column if not exists wholesale_stotinki integer,
  add column if not exists supplier text,
  add column if not exists supplier_url text;

-- ── Уникалност по име за upsert-a ─────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_products_name_unique') then
    alter table public.catalog_products
      add constraint catalog_products_name_unique unique (name);
  end if;
end $$;

-- ── Cleanup: махаме продукти от отпадналите категории, ако вече са
--    seed-нати от предната версия на тази миграция (drinks, sandwiches,
--    и Био Яйца от Harmonica).
delete from public.catalog_products where category in ('drinks', 'sandwiches');
delete from public.catalog_products where name = 'Био Яйца 6 бр. размер L';

-- ── SEED ──────────────────────────────────────────────────────────────
insert into public.catalog_products
  (name, category, wholesale_stotinki, price_stotinki, supplier,
   kcal_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving,
   serving_size, serving_unit, available, sort_order)
values
  -- ══════════════════════════════════════════════════════════════════
  -- ПРОТЕИНОВИ БАРОВЕ, КУКИТА И СНАКСОВЕ (bars_snacks)
  -- ══════════════════════════════════════════════════════════════════
  ('XFuel Lentil Chips Truffle & Cheese 70 г',         'bars_snacks', 323, 528, 'XFuel', 350, 21, 45, 8, 70, 'g', true, 2010),
  ('XFuel Lentil Chips Sour Cream & Onion 70 г',       'bars_snacks', 323, 528, 'XFuel', 350, 21, 45, 8, 70, 'g', true, 2011),
  ('XFuel Lentil Chips BBQ 70 г',                      'bars_snacks', 323, 528, 'XFuel', 350, 21, 45, 8, 70, 'g', true, 2012),
  ('XFuel Lentil Chips Chilli & Lime 70 г',            'bars_snacks', 323, 528, 'XFuel', 350, 21, 45, 8, 70, 'g', true, 2013),
  ('XFuel High Protein Bar Choco Cookie 55 г',         'bars_snacks', 323, 528, 'XFuel', 200, 20, 20, 6, 55, 'g', true, 2014),
  ('XFuel Soft Cookie Raspberry & White 50 г',         'bars_snacks', 323, 528, 'XFuel', 210, 15, 22, 8, 50, 'g', true, 2015),
  ('XFuel Soft Cookie Double Chocolate 50 г',          'bars_snacks', 323, 528, 'XFuel', 210, 15, 22, 8, 50, 'g', true, 2016),
  ('BW Актив бар 60 г',                                'bars_snacks', 270, 450, 'Уинър Трейд', 220, 20, 22, 6, 60, 'g', true, 2020),
  ('BW Бууст бар 55 г',                                'bars_snacks', 231, 391, 'Уинър Трейд', 210, 20, 18, 6, 55, 'g', true, 2021),
  ('BW Слим бар 50 г',                                 'bars_snacks', 292, 490, 'Уинър Трейд', 180, 20, 12, 4, 50, 'g', true, 2022),
  ('BW Гейн бар 75 г',                                 'bars_snacks', 323, 528, 'Уинър Трейд', 290, 22, 35, 8, 75, 'g', true, 2023),
  ('BW CORE бар 57 г',                                 'bars_snacks', 323, 528, 'Уинър Трейд', 220, 22, 20, 6, 57, 'g', true, 2024),
  ('BW CORE PLUS бар 65 г',                            'bars_snacks', 339, 548, 'Уинър Трейд', 250, 24, 22, 7, 65, 'g', true, 2025),
  ('BW Мега Про бар 85 г',                             'bars_snacks', 346, 567, 'Уинър Трейд', 320, 30, 25, 10, 85, 'g', true, 2026),
  ('BW Делукс Крънч бар 64 г',                         'bars_snacks', 374, 567, 'Уинър Трейд', 250, 22, 24, 8, 64, 'g', true, 2027),
  ('BW Делукс бар 55 г',                               'bars_snacks', 307, 509, 'Уинър Трейд', 220, 20, 22, 7, 55, 'g', true, 2028),
  ('BW Делукс бар Фъстъци 57 г',                       'bars_snacks', 358, 567, 'Уинър Трейд', 240, 22, 22, 9, 57, 'g', true, 2029),
  ('BW U17 бар 60 г',                                  'bars_snacks', 319, 509, 'Уинър Трейд', 220, 20, 22, 6, 60, 'g', true, 2030),
  ('BW КЕТО бар 60 г',                                 'bars_snacks', 323, 528, 'Уинър Трейд', 230, 15, 5,  18, 60, 'g', true, 2031),
  ('BW Протеиново куки Актив/Бууст 75 г',              'bars_snacks', 291, 490, 'Уинър Трейд', 280, 20, 25, 10, 75, 'g', true, 2032),
  ('BW Протеиново куки Слим/Делукс 60-75 г',           'bars_snacks', 323, 528, 'Уинър Трейд', 280, 20, 25, 10, 75, 'g', true, 2033),
  ('BW Протеиново брауни 75 г',                        'bars_snacks', 323, 528, 'Уинър Трейд', 290, 20, 25, 12, 75, 'g', true, 2034),
  ('BW Протеиново блонди 75 г',                        'bars_snacks', 323, 528, 'Уинър Трейд', 290, 20, 25, 12, 75, 'g', true, 2035),
  ('BW Протеинови шоколадови чашки 42 г',              'bars_snacks', 319, 528, 'Уинър Трейд', 180, 12, 15, 9, 42, 'g', true, 2036),
  ('BW Протеинови хрупкави чашки 50 г',                'bars_snacks', 319, 528, 'Уинър Трейд', 210, 14, 18, 10, 50, 'g', true, 2037),
  ('BW Бисквити без захар 100 г',                      'bars_snacks', 292, 470, 'Уинър Трейд', 440, 8,  55, 20, 100, 'g', true, 2038),
  ('BW Бисквити Шоко Чип 130 г',                       'bars_snacks', 323, 509, 'Уинър Трейд', 460, 8,  55, 22, 100, 'g', true, 2039),
  ('BW Флапджак 90 г',                                 'bars_snacks', 207, 372, 'Уинър Трейд', 360, 8,  50, 14, 90, 'g', true, 2040),
  ('BW Флапджак 100 г',                                'bars_snacks', 242, 410, 'Уинър Трейд', 360, 8,  50, 14, 100, 'g', true, 2041),
  ('FitSpo протеинов бар 25 г',                        'bars_snacks', 350, 567, 'FitSpo', 200, 25, 15, 7, 60, 'g', true, 2042),
  ('FitSpo протеинови бисквити 70 г',                  'bars_snacks', 332, 548, 'FitSpo', 260, 20, 22, 9, 70, 'g', true, 2043),
  ('FitSpo флапджак 80 г',                             'bars_snacks', 207, 372, 'FitSpo', 340, 8,  45, 13, 80, 'g', true, 2044),
  ('FitSpo флапджак 90 г',                             'bars_snacks', 233, 410, 'FitSpo', 360, 8,  50, 14, 90, 'g', true, 2045),
  ('FitSpo Rawllin Balls веган 48 г',                  'bars_snacks', 182, 372, 'FitSpo', 180, 6,  22, 7, 48, 'g', true, 2046),

  -- ══════════════════════════════════════════════════════════════════
  -- ЗАКУСКА И БАКАЛИЯ — БИО (pantry, Harmonica)
  -- ══════════════════════════════════════════════════════════════════
  ('Гранола боровинки и ванилия 250 г',                'pantry', 1022, 1663, 'Harmonica', 420, 10, 55, 15, 100, 'g', true, 4010),
  ('Гранола фъстъчено масло и какао 250 г',            'pantry',  830, 1467, 'Harmonica', 460, 12, 50, 20, 100, 'g', true, 4011),
  ('Овесена гранола ябълки и канела 250 г',            'pantry',  830, 1467, 'Harmonica', 400, 9,  55, 13, 100, 'g', true, 4012),
  ('Мюсли с лешници и бадеми 300 г',                   'pantry',  430,  822, 'Harmonica', 400, 10, 55, 14, 100, 'g', true, 4013),
  ('Мюсли със смокини и черници 300 г',                'pantry',  430,  822, 'Harmonica', 380, 8,  60, 10, 100, 'g', true, 4014),
  ('Оризови топчета млечен шоколад 50 г',              'pantry',  319,  548, 'Harmonica', 510, 8,  55, 27, 100, 'g', true, 4015),
  ('Оризови топчета черен шоколад 50 г',               'pantry',  319,  548, 'Harmonica', 490, 8,  55, 25, 100, 'g', true, 4016),
  ('Оризови топчета бял шоколад и малина 50 г',        'pantry',  319,  548, 'Harmonica', 520, 8,  58, 27, 100, 'g', true, 4017),
  ('Вафла Класика 30 г',                               'pantry',   82,  175, 'Harmonica', 480, 6,  60, 22, 100, 'g', true, 4018),
  ('Вафла Биотик Плюс 30 г',                           'pantry',   92,  185, 'Harmonica', 480, 6,  60, 22, 100, 'g', true, 4019),
  ('Вафла Лимон 30 г',                                 'pantry',   82,  175, 'Harmonica', 480, 6,  60, 22, 100, 'g', true, 4020),
  ('Вафла без добавена захар 30 г',                    'pantry',   92,  185, 'Harmonica', 460, 6,  55, 22, 100, 'g', true, 4021),
  ('Тунквана вафла с пробиотик 40 г',                  'pantry',  143,  274, 'Harmonica', 500, 6,  58, 25, 100, 'g', true, 4022),
  ('Тунквана вафла с кокос 40 г',                      'pantry',  143,  274, 'Harmonica', 500, 6,  58, 25, 100, 'g', true, 4023),
  ('Тунквана вафла Класика 40 г',                      'pantry',  129,  254, 'Harmonica', 500, 6,  58, 25, 100, 'g', true, 4024),
  ('Тунквана вафла без добавена захар 40 г',           'pantry',  168,  313, 'Harmonica', 480, 6,  55, 25, 100, 'g', true, 4025),
  ('Бял тахан 250 г',                                  'pantry',  575,  959, 'Harmonica', 590, 20, 15, 50, 100, 'g', true, 4026),
  ('Бял тахан 700 г',                                  'pantry', 1150, 1937, 'Harmonica', 590, 20, 15, 50, 100, 'g', true, 4027),
  ('Пълнозърнест тахан 250 г',                         'pantry',  575,  959, 'Harmonica', 590, 20, 15, 50, 100, 'g', true, 4028),
  ('Пълнозърнест тахан 700 г',                         'pantry', 1149, 1937, 'Harmonica', 590, 20, 15, 50, 100, 'g', true, 4029),
  ('Черен тахан 250 г',                                'pantry',  595, 1017, 'Harmonica', 570, 20, 15, 48, 100, 'g', true, 4030),
  ('Лешников тахан 250 г',                             'pantry', 1154, 1937, 'Harmonica', 640, 15, 15, 55, 100, 'g', true, 4031),
  ('Фъстъчено масло 250 г',                            'pantry',  575,  959, 'Harmonica', 600, 25, 15, 50, 100, 'g', true, 4032),
  ('Фъстъчено масло 700 г',                            'pantry', 1149, 1937, 'Harmonica', 600, 25, 15, 50, 100, 'g', true, 4033),
  ('Фъстъчено масло с парченца 250 г',                 'pantry',  575,  959, 'Harmonica', 600, 25, 15, 50, 100, 'g', true, 4034),
  ('Солети с хималайска сол 60 г',                     'pantry',  127,  254, 'Harmonica', 400, 10, 70, 8, 100, 'g', true, 4035),
  ('Пълнозърнести солети 60 г',                        'pantry',  127,  254, 'Harmonica', 400, 10, 70, 8, 100, 'g', true, 4036),
  ('Солети от лимец 50 г',                             'pantry',  160,  293, 'Harmonica', 400, 10, 70, 8, 100, 'g', true, 4037),
  ('Претцели с хималайска сол 60 г',                   'pantry',  127,  254, 'Harmonica', 400, 10, 70, 8, 100, 'g', true, 4038),
  ('Тънки претцели с морска сол 80 г',                 'pantry',  160,  293, 'Harmonica', 400, 10, 70, 8, 100, 'g', true, 4039),
  ('Печени бадеми 80 г',                               'pantry',  299,  567, 'Harmonica', 580, 20, 10, 50, 100, 'g', true, 4040),
  ('Печени лешници 80 г',                              'pantry',  334,  626, 'Harmonica', 620, 15, 10, 60, 100, 'g', true, 4041),

  -- ══════════════════════════════════════════════════════════════════
  -- СПОРТНИ СУПЛЕМЕНТИ (supplements)
  -- ══════════════════════════════════════════════════════════════════
  ('FitSpo Whey Pro протеин 908 г',                    'supplements', 6250, 9760, 'FitSpo',      120, 25, 2, 1.5, 30, 'g', true, 5010),
  ('FitSpo протеиново саше 30 г',                      'supplements',  248,  430, 'FitSpo',      120, 25, 2, 1.5, 30, 'g', true, 5011),
  ('BW Протеиново саше 30 г',                          'supplements',  254,  430, 'Уинър Трейд', 118, 24, 2, 1.5, 30, 'g', true, 5012),
  ('BW Протеинов бленд Дойпак 810 г',                  'supplements', 5583, 8781, 'Уинър Трейд', 118, 24, 2, 1.5, 30, 'g', true, 5013)

on conflict (name) do update set
  category            = excluded.category,
  wholesale_stotinki  = excluded.wholesale_stotinki,
  price_stotinki      = excluded.price_stotinki,
  supplier            = excluded.supplier,
  kcal_per_serving    = excluded.kcal_per_serving,
  protein_per_serving = excluded.protein_per_serving,
  carbs_per_serving   = excluded.carbs_per_serving,
  fat_per_serving     = excluded.fat_per_serving,
  serving_size        = excluded.serving_size,
  serving_unit        = excluded.serving_unit,
  sort_order          = excluded.sort_order;
