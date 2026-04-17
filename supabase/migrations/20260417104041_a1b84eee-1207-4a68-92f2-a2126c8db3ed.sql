-- Add multi-currency + advance link fields to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS original_amount bigint,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS original_currency text,
  ADD COLUMN IF NOT EXISTS advance_id uuid REFERENCES public.advances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submission_date date NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_expenses_advance_id ON public.expenses(advance_id);
CREATE INDEX IF NOT EXISTS idx_expenses_client_status ON public.expenses(client_id, status);