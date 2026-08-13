-- Where a client came from.
--
-- A TikTok video cannot carry a link: the viewer has to read the address, hold
-- it in their head and type it. That makes it impossible to tell, afterwards,
-- whether the video brought anybody at all — and without that the choice
-- between making another one and stopping is a guess.
--
-- The landing page reads ?src= off the address and keeps it until the account
-- is made, which is the only moment there is anything to attach it to. Null for
-- everyone who arrived by simply knowing the address, which is most people and
-- is not a failure to record.
alter table public.profiles
  add column if not exists source text;

comment on column public.profiles.source is
  'campaign the visitor arrived from, read from ?src= on the landing page';
