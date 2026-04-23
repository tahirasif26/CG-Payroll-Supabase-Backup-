-- Bridge: navigation module key -> feature_definitions module_key(s).
-- If a client enables "loans" (sidebar grouping), both loans + advances feature modules are allowed.
-- If a client enables "employees", birthdays + profile are also allowed.
CREATE OR REPLACE FUNCTION public.client_module_to_feature_modules(_nav_key text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT CASE _nav_key
    WHEN 'loans' THEN ARRAY['loans','advances']
    WHEN 'employees' THEN ARRAY['employees','profile','birthdays']
    ELSE ARRAY[_nav_key]
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_feature_access(_user_id uuid)
 RETURNS TABLE(feature_key text, module_key text, access_level feature_access_level)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_client_id uuid;
  v_is_super boolean;
  v_enabled_modules text[];
  v_expanded_modules text[];
BEGIN
  v_role := public.get_user_role(_user_id)::text;
  v_client_id := public.get_user_client_id(_user_id);
  v_is_super := public.is_super_admin(_user_id);

  SELECT c.enabled_modules INTO v_enabled_modules
  FROM public.clients c WHERE c.id = v_client_id;

  -- Expand navigation-level keys to feature-definition module keys.
  IF v_enabled_modules IS NOT NULL AND cardinality(v_enabled_modules) > 0 THEN
    SELECT array_agg(DISTINCT fm) INTO v_expanded_modules
    FROM unnest(v_enabled_modules) nav_key,
         unnest(public.client_module_to_feature_modules(nav_key)) fm;
  ELSE
    v_expanded_modules := v_enabled_modules;
  END IF;

  RETURN QUERY
  SELECT
    fd.feature_key,
    fd.module_key,
    CASE
      WHEN v_is_super THEN 'edit'::public.feature_access_level
      WHEN v_expanded_modules IS NOT NULL
        AND cardinality(v_expanded_modules) > 0
        AND NOT (fd.module_key = ANY(v_expanded_modules))
        THEN 'none'::public.feature_access_level
      WHEN v_role = 'admin' THEN 'edit'::public.feature_access_level
      WHEN ft.access_level IS NOT NULL THEN ft.access_level
      WHEN v_role IS NOT NULL AND v_role = ANY(fd.default_enabled_for_roles)
        THEN 'edit'::public.feature_access_level
      ELSE 'none'::public.feature_access_level
    END AS access_level
  FROM public.feature_definitions fd
  LEFT JOIN public.feature_toggles ft
    ON ft.feature_key = fd.feature_key AND ft.user_id = _user_id;
END;
$function$;