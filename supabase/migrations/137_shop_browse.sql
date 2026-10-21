-- 137_shop_browse.sql — данните, от които магазинът филтрира и сравнява (21.10.2026).
--
-- По проучването (бележката „Магазин — проучване на UX“): хората търсят по цел,
-- сравняват по цена на доза, а размерите на един продукт искат като бутони.
--   goals        — целите, по които се филтрира (strength, recovery, energy, health)
--   servings     — колко дози/броя има в опаковката; цена на доза = цена / servings
--   serving_unit — „доза“ или „бр.“
--   tags         — само това, което пише на опаковката: vegan, no_sugar
--   size_group   — продукти с един и същ group са размери на едно и също

alter table public.shop_products
  add column if not exists goals text[] not null default '{}',
  add column if not exists servings integer,
  add column if not exists serving_unit text not null default 'доза',
  add column if not exists tags text[] not null default '{}',
  add column if not exists size_group text;

update public.shop_products p set goals = v.goals, servings = v.servings, serving_unit = v.unit,
  tags = v.tags, size_group = v.grp, updated_at = now()
from (values
  ('core-champs-whey-2270',       array['strength','recovery'], 66,  'доза', '{}'::text[], null),
  ('la-whey-1000',                array['strength','recovery'], 33,  'доза', '{}'::text[], null),
  ('dennis-james-whey-2000',      array['strength','recovery'], 57,  'доза', '{}'::text[], null),
  ('yava-pure-iso-1000',          array['strength','recovery'], 33,  'доза', '{}'::text[], null),
  ('yava-vegan-2000',             array['strength','recovery'], 66,  'доза', array['vegan'],  null),
  ('6pak-creatine-300',           array['strength'],            50,  'доза', '{}'::text[], '6pak-creatine'),
  ('6pak-creatine-500',           array['strength'],            83,  'доза', '{}'::text[], '6pak-creatine'),
  ('levrone-crea-1000',           array['strength'],            200, 'доза', '{}'::text[], null),
  ('ostrovit-eaa-600',            array['recovery'],            60,  'доза', '{}'::text[], null),
  ('6pak-citrulline-450',         array['energy'],              150, 'доза', '{}'::text[], null),
  ('fa-ice-pump-463',             array['energy'],              100, 'доза', '{}'::text[], null),
  ('6pak-beta-alanine-200',       array['energy'],              248, 'доза', '{}'::text[], null),
  ('essensey-caffeine-120',       array['energy'],              120, 'доза', '{}'::text[], null),
  ('nutriversum-d3k2-120',        array['health'],              120, 'доза', '{}'::text[], null),
  ('6pak-zinc-120',               array['health','recovery'],   120, 'доза', '{}'::text[], null),
  ('allnutrition-mg-citrate-100', array['health','recovery'],   100, 'доза', '{}'::text[], null),
  ('myprotein-alpha-men-120',     array['health'],              60,  'доза', '{}'::text[], null),
  ('ostrovit-ashwagandha-90',     array['health'],              90,  'доза', '{}'::text[], null),
  ('allnutrition-omega3-90',      array['health'],              90,  'доза', '{}'::text[], null),
  ('applied-electrolyte-20',      array['energy','recovery'],   20,  'доза', '{}'::text[], null),
  ('ostrovit-electrolytes-270',   array['energy','recovery'],   90,  'доза', array['no_sugar'], null),
  ('mhn-muffin',                  '{}'::text[],                 1,   'бр.',  array['no_sugar'], null),
  ('bw-boost-bar',                '{}'::text[],                 1,   'бр.',  '{}'::text[], null),
  ('bw-core-bar',                 '{}'::text[],                 1,   'бр.',  '{}'::text[], null),
  ('riceup-collagen-bar',         '{}'::text[],                 1,   'бр.',  '{}'::text[], null),
  ('riceup-protein-chips',        '{}'::text[],                 1,   'бр.',  '{}'::text[], null),
  ('riceup-rice-bar',             '{}'::text[],                 1,   'бр.',  array['no_sugar'], null),
  ('fitspo-flapjack',             '{}'::text[],                 1,   'бр.',  '{}'::text[], null)
) as v(id, goals, servings, unit, tags, grp)
where p.id = v.id;
