-- Add savings_amount column to budget_config
-- Stores the user's declared emergency savings (not counted in daily quota)
ALTER TABLE public.budget_config
  ADD COLUMN IF NOT EXISTS savings_amount numeric(12,2) NOT NULL DEFAULT 0;
