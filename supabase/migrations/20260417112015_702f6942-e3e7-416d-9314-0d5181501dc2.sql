ALTER TABLE public.performance_calibrations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';