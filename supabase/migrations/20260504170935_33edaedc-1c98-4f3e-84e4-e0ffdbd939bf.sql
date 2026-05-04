CREATE OR REPLACE FUNCTION public.client_module_to_feature_modules(_nav_key text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _nav_key
    WHEN 'employees' THEN ARRAY['employees','leave']
    WHEN 'payroll'   THEN ARRAY['payroll','loans']
    WHEN 'expenses'  THEN ARRAY['expenses','loans']
    ELSE ARRAY[_nav_key]
  END;
$function$;