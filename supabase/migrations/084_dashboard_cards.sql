-- Which cards a client wants on Днес, and in what order.
--
-- An array of card ids, e.g. ["readiness","weight","habits"]. Order in the
-- array is order on the page; anything missing from it is hidden. Null means
-- the client has never touched the setting and gets the default layout — which
-- is not the same as an empty array, where they have deliberately emptied the
-- page.
--
-- On the profile rather than in localStorage: the same person opens this on a
-- phone and on a laptop, and a layout that resets when they do is worse than no
-- setting at all. It also means the coach could set a starting layout for a new
-- client later without a second place to look.
alter table public.profiles add column if not exists dashboard_cards jsonb;

comment on column public.profiles.dashboard_cards is
  'Ordered list of Today-page card ids the client has chosen. Null = default layout.';
