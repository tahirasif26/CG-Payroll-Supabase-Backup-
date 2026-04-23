-- Re-group feature_definitions to match navigation grouping app-wide.
-- Loans + Advances => "loans" module. Employees + Profile + Birthdays => "employees" module.

UPDATE public.feature_definitions
SET module_key = 'loans', module = 'Loans & Advances'
WHERE module_key = 'advances';

UPDATE public.feature_definitions
SET module_key = 'employees', module = 'Employees'
WHERE module_key IN ('profile', 'birthdays');

-- Migrate any client.enabled_modules entries that still reference the old keys.
UPDATE public.clients
SET enabled_modules = (
  SELECT ARRAY(
    SELECT DISTINCT CASE
      WHEN m = 'advances' THEN 'loans'
      WHEN m IN ('profile','birthdays') THEN 'employees'
      ELSE m
    END
    FROM unnest(enabled_modules) m
  )
)
WHERE enabled_modules && ARRAY['advances','profile','birthdays']::text[];

-- Bridge function no longer needs to expand keys (definitions are now aligned with nav).
CREATE OR REPLACE FUNCTION public.client_module_to_feature_modules(_nav_key text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT ARRAY[_nav_key];
$$;
