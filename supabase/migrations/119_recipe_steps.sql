-- 119_recipe_steps.sql — Рецептите стават четими стъпка по стъпка.
--
-- Библиотеката в Хранене вече е една: рецептите от `recipes`, отворени като
-- четец на цял екран — корица, по една страница на стъпка, накрая готовото
-- ястие и „Впиши в дневника". Затова рецептата носи и стъпките си.
--
-- Само се добавя; нищо не се трие и старите редове остават валидни
-- (празен списък стъпки = рецепта без четец, само с макроси).
--
--   steps     — [{ "text": "...", "photo_url": "..." | null, "bonus": false }]
--               „bonus" е стъпка след основните („да е още по-благо").
--   prep_min  — колко минути отнема; показва се на корицата и в картата.
--   category  — pre | post | breakfast | lunch | dinner | snack | null,
--               за филтрите в библиотеката.
--
-- Видимостта не се променя: всеки вижда своите рецепти, а клиентите виждат
-- и споделените от треньора си (is_shared) — политиките от 022_recipes.sql.

alter table public.recipes
  add column if not exists steps    jsonb not null default '[]'::jsonb,
  add column if not exists prep_min int,
  add column if not exists category text;

alter table public.recipes
  drop constraint if exists recipes_category_check;
alter table public.recipes
  add constraint recipes_category_check
  check (category is null or category in ('pre', 'post', 'breakfast', 'lunch', 'dinner', 'snack'));
