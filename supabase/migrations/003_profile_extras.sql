-- ============================================================
-- 003_profile_extras.sql — Add training plan, notes, target weight
-- Run in Supabase SQL Editor after 002_client_data.sql
-- ============================================================

alter table public.profiles
  add column if not exists training_plan  jsonb,
  add column if not exists coach_notes    text    not null default '',
  add column if not exists target_weight  numeric;
