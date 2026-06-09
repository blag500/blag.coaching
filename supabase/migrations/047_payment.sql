-- 047_payment.sql
-- Adds payment tracking columns to training_sessions for Stripe invoicing

alter table public.training_sessions
  add column if not exists payment_status    text check (payment_status in ('invoiced', 'paid')),
  add column if not exists stripe_invoice_id text,
  add column if not exists price_bgn         numeric(10, 2);
