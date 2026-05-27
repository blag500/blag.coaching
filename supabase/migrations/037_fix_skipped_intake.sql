-- 037_fix_skipped_intake.sql
-- Reset intake_done for clients whose intake_done was set to true by migration 034
-- (which grandfathered users who already had a plan) but who never actually
-- submitted the contact form — identified by a missing phone number.
-- Safe to run: only resets users who have no phone on file.

update public.profiles
set intake_done = false
where role = 'client'
  and intake_done = true
  and (phone is null or phone = '');
