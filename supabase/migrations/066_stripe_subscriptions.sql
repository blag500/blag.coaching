-- 066_stripe_subscriptions.sql
-- Adds Stripe subscription tracking to profiles for PRO/COACHING plan gating

alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;
