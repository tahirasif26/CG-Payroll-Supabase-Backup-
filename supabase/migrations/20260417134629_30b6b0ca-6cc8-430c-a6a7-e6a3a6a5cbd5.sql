ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS setup_completed_steps text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS setup_dismissed_at timestamptz;