-- Конфигурируеми ястия за публичното меню на Чийт Код.
--
-- Рецептите вече пазят съставките си като jsonb с grams и per100g отделно —
-- точно формата, която един плъзгач иска: дърпаш грамовете, макросите се
-- смятат наум. Липсваха четири неща: цената на съставката, границите ѝ,
-- слотовете за замяна и цената на кутията.
--
-- Всичко остава в recipes, вместо да се дублира в нова таблица. Една и съща
-- рецепта е и това, което клиентът чете в приложението, и това, което
-- непознат конфигурира на сайта. Две таблици значат два източника на истина
-- за едни и същи макроси, а те се разминават още при първата поправка.

alter table public.recipes
  add column if not exists is_public            boolean not null default false,
  add column if not exists base_price_stotinki  integer,
  add column if not exists packaging_stotinki   integer not null default 0,
  add column if not exists slots                jsonb   not null default '[]'::jsonb;

comment on column public.recipes.is_public is
  'Излиза ли в публичното меню на сайта. Рецептите в приложението остават false.';
comment on column public.recipes.base_price_stotinki is
  'Цена на основата в евроцентове. Съставките и слотовете добавят отгоре.';
comment on column public.recipes.packaging_stotinki is
  'Кутия, капак и етикет за една порция. Влиза в себестойността, не в цената на съставка.';
comment on column public.recipes.slots is
  'Местата за замяна. Всеки слот е {id, name, required, default, options[]}; всяка опция носи своите grams, per100g, cost_per100 и граници — същата форма като съставка, плюс extra_packaging за кофичката, ако се сервира отделно.';

-- Съставките получават цена и граници. Ключовете са незадължителни: рецепта
-- без тях се държи както досега, само че не може да се конфигурира.
--
--   cost_per100  евроцентове за 100 г, С ДДС — Благ Холдинг не е регистрирано
--                по ДДС, значи го плаща и не го приспада
--   min_g/max_g  докъде се движи плъзгачът
--   step_g       на колко скача
--   discrete     true за неща, които не се делят — яйце, филия
--   unit_g       теглото на едно парче, когато discrete е true
--   locked       съставка, която не се пипа

comment on column public.recipes.ingredients is
  'Съставките като [{name, grams, per100g:{kcal,protein,carbs,fat}, cost_per100, min_g, max_g, step_g, discrete, unit_g, locked}]. Последните шест са незадължителни и се ползват само от конфигуратора.';

create index if not exists recipes_public_idx
  on public.recipes (created_at desc)
  where is_public;

-- Благо кремче става първото конфигурируемо ястие.
--
-- Цените са от 26.09.2026, на дребно, с ДДС:
--   овесени трици  Здраве за вас 200 г, €0.93       → €0.465/100 г
--   какао          Dr. Oetker 50 г, €1.10           → €2.20 /100 г
--   замразени ягоди Магре 400 г, €2.24              → €0.56 /100 г
--   банани         Метро, €1.78/кг с ДДС            → €0.178/100 г
--   протеин        2 кг за €45                      → €2.25 /100 г
--   тахан          ЛИПСВА — cost_per100 е null, опцията не се продава,
--                  докато не се попълни
--   опаковка       купа крафт 750 мл + PET капак €0.125 + ~€0.025 етикет
--   кофичка        PP 60 мл с капак €0.018, само за глазурата и тахана
--
-- Какаото е половината от основата, а е 17% от теглото — защото е кутийка от
-- 50 г. Килограмова опаковка от кетъринг доставчик е най-големият лост тук.

update public.recipes
set
  is_public = true,
  packaging_stotinki = 15,
  ingredients = '[
    {"name":"Овесени трици","grams":100,
     "per100g":{"kcal":246,"protein":17.3,"carbs":66.2,"fat":7},
     "cost_per100":46.5,"min_g":50,"max_g":150,"step_g":10},
    {"name":"Какао","grams":20,
     "per100g":{"kcal":228,"protein":19.6,"carbs":57.9,"fat":13.7},
     "cost_per100":220,"min_g":0,"max_g":40,"step_g":5}
  ]'::jsonb,
  slots = '[
    {"id":"zalivka","name":"Заливка","required":false,"default":"yagodi",
     "options":[
       {"id":"yagodi","name":"Замразени ягоди","grams":100,
        "per100g":{"kcal":32,"protein":0.7,"carbs":7.7,"fat":0.3},
        "cost_per100":56,"min_g":50,"max_g":150,"step_g":25,"extra_packaging":0},
       {"id":"banan","name":"Банан","grams":100,
        "per100g":{"kcal":89,"protein":1.1,"carbs":22.8,"fat":0.3},
        "cost_per100":17.8,"min_g":50,"max_g":150,"step_g":25,"extra_packaging":0},
       {"id":"protein","name":"Протеинова глазура","grams":30,
        "per100g":{"kcal":380,"protein":75,"carbs":8,"fat":5},
        "cost_per100":225,"min_g":15,"max_g":50,"step_g":5,"extra_packaging":2},
       {"id":"tahan","name":"Тахан","grams":20,
        "per100g":{"kcal":595,"protein":17,"carbs":21,"fat":53.8},
        "cost_per100":null,"min_g":10,"max_g":40,"step_g":5,"extra_packaging":2}
     ]}
  ]'::jsonb
where name ilike '%кремче%';
