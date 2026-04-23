ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS enabled_features text[] DEFAULT NULL;

COMMENT ON COLUMN public.employees.enabled_features IS 
  'Array of feature keys this employee has access to. NULL means inherit all client-enabled features.';

CREATE INDEX IF NOT EXISTS idx_employees_enabled_features 
  ON public.employees USING GIN (enabled_features);