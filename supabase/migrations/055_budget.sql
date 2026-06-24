-- Budget: one config per user per month + individual transactions

CREATE TABLE IF NOT EXISTS public.budget_config (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month            date        NOT NULL,  -- first day of the month, e.g. 2026-06-01
  budget_amount    numeric(12,2) NOT NULL DEFAULT 0,
  buffer_pct       numeric(5,4)  NOT NULL DEFAULT 0.1,
  planned_expenses jsonb         NOT NULL DEFAULT '[]',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.budget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own budget config"
  ON public.budget_config FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  description text,
  amount      numeric(12,2) NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own budget transactions"
  ON public.budget_transactions FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
