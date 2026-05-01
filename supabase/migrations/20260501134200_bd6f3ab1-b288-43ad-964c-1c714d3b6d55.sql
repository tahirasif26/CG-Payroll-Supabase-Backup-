CREATE OR REPLACE FUNCTION public.get_role_features(_user_id uuid)
RETURNS TABLE(feature_key text, people_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rf.feature_key, rf.people_enabled
  FROM public.role_features rf
  INNER JOIN public.employees e ON e.role_id = rf.role_id
  WHERE e.user_id = _user_id
    AND e.client_id = public.get_user_client_id(_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_role_features(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_employee_role_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.role_id
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.client_id = public.get_user_client_id(_user_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_role_id(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_feature_access(_user_id uuid)
RETURNS TABLE(feature_key text, module_key text, access_level public.feature_access_level)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_client_id uuid;
  v_is_super boolean;
  v_enabled_modules text[];
  v_expanded_modules text[];
  v_enabled_features text[];
  v_employee_features text[];
  v_role_features text[];
BEGIN
  v_role := public.get_user_role(_user_id)::text;
  v_client_id := public.get_user_client_id(_user_id);
  v_is_super := public.is_super_admin(_user_id);

  SELECT c.enabled_modules, c.enabled_features
    INTO v_enabled_modules, v_enabled_features
  FROM public.clients c
  WHERE c.id = v_client_id;

  SELECT e.enabled_features
    INTO v_employee_features
  FROM public.employees e
  WHERE e.user_id = _user_id
    AND e.client_id = v_client_id
  LIMIT 1;

  SELECT array_agg(DISTINCT rf.feature_key)
    INTO v_role_features
  FROM public.role_features rf
  INNER JOIN public.employees e ON e.role_id = rf.role_id
  WHERE e.user_id = _user_id
    AND e.client_id = v_client_id;

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
      WHEN v_enabled_features IS NOT NULL
        AND cardinality(v_enabled_features) > 0
        AND NOT (fd.feature_key = ANY(v_enabled_features))
        THEN 'none'::public.feature_access_level
      WHEN v_role = 'admin' THEN 'edit'::public.feature_access_level
      WHEN v_role = 'hr'
        AND v_role_features IS NOT NULL
        AND cardinality(v_role_features) > 0
        AND NOT (fd.feature_key = ANY(v_role_features))
        THEN 'none'::public.feature_access_level
      WHEN v_role = 'hr'
        AND v_role_features IS NOT NULL
        AND cardinality(v_role_features) > 0
        AND v_employee_features IS NOT NULL
        AND NOT (fd.feature_key = ANY(v_employee_features))
        THEN 'none'::public.feature_access_level
      WHEN v_role = 'hr'
        AND v_role_features IS NOT NULL
        AND cardinality(v_role_features) > 0
        THEN 'edit'::public.feature_access_level
      WHEN v_employee_features IS NOT NULL
        AND NOT (fd.feature_key = ANY(v_employee_features))
        THEN 'none'::public.feature_access_level
      WHEN ft.access_level IS NOT NULL THEN ft.access_level
      WHEN v_role IS NOT NULL AND v_role = ANY(fd.default_enabled_for_roles)
        THEN 'edit'::public.feature_access_level
      ELSE 'none'::public.feature_access_level
    END AS access_level
  FROM public.feature_definitions fd
  LEFT JOIN public.feature_toggles ft
    ON ft.feature_key = fd.feature_key
   AND ft.user_id = _user_id
   AND ft.client_id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_feature_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_features(uuid) TO authenticated;