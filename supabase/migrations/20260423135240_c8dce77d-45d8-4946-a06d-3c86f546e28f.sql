ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS enabled_features text[] DEFAULT NULL;

COMMENT ON COLUMN public.clients.enabled_features IS 
  'Array of feature keys this client has access to. NULL means all features in enabled_modules are granted.';

CREATE INDEX IF NOT EXISTS idx_clients_enabled_features 
  ON public.clients USING GIN (enabled_features);

-- Helper RPC to fetch a user's enabled features (RLS-safe)
CREATE OR REPLACE FUNCTION public.get_user_enabled_features(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.enabled_features
  FROM public.clients c
  WHERE c.id = public.get_user_client_id(_user_id)
  LIMIT 1;
$$;

-- Update feature access function to honor client-level enabled_features
CREATE OR REPLACE FUNCTION public.get_user_feature_access(_user_id uuid)
RETURNS TABLE(feature_key text, module_key text, access_level public.feature_access_level)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_client_id uuid;
  v_is_super boolean;
  v_enabled_modules text[];
  v_expanded_modules text[];
  v_enabled_features text[];
BEGIN
  v_role := public.get_user_role(_user_id)::text;
  v_client_id := public.get_user_client_id(_user_id);
  v_is_super := public.is_super_admin(_user_id);

  SELECT c.enabled_modules, c.enabled_features
    INTO v_enabled_modules, v_enabled_features
  FROM public.clients c WHERE c.id = v_client_id;

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
      WHEN ft.access_level IS NOT NULL THEN ft.access_level
      WHEN v_role IS NOT NULL AND v_role = ANY(fd.default_enabled_for_roles)
        THEN 'edit'::public.feature_access_level
      ELSE 'none'::public.feature_access_level
    END AS access_level
  FROM public.feature_definitions fd
  LEFT JOIN public.feature_toggles ft
    ON ft.feature_key = fd.feature_key AND ft.user_id = _user_id;
END;
$$;