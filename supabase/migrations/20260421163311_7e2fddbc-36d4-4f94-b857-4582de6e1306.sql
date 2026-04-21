-- 1. Access level enum
DO $$ BEGIN
  CREATE TYPE public.feature_access_level AS ENUM ('none', 'view', 'edit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Clients: enabled modules
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.clients.enabled_modules IS
  'Module keys enabled for this tenant. Empty array = all modules enabled (legacy default).';

-- 3. feature_definitions: module_key
ALTER TABLE public.feature_definitions
  ADD COLUMN IF NOT EXISTS module_key text;

UPDATE public.feature_definitions
SET module_key = lower(regexp_replace(module, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE module_key IS NULL;

ALTER TABLE public.feature_definitions
  ALTER COLUMN module_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_definitions_module_key
  ON public.feature_definitions(module_key);

-- 4. feature_toggles: access_level
ALTER TABLE public.feature_toggles
  ADD COLUMN IF NOT EXISTS access_level public.feature_access_level;

UPDATE public.feature_toggles
SET access_level = CASE WHEN is_enabled THEN 'edit'::public.feature_access_level
                        ELSE 'none'::public.feature_access_level END
WHERE access_level IS NULL;

ALTER TABLE public.feature_toggles
  ALTER COLUMN access_level SET NOT NULL,
  ALTER COLUMN access_level SET DEFAULT 'edit'::public.feature_access_level;

-- 5. client_has_module
CREATE OR REPLACE FUNCTION public.client_has_module(_client_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT cardinality(enabled_modules) = 0 OR _module_key = ANY(enabled_modules)
     FROM public.clients WHERE id = _client_id),
    false
  );
$$;

-- 6. get_user_feature_access (fixed: explicit cast of role enum to text)
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
BEGIN
  v_role := public.get_user_role(_user_id)::text;
  v_client_id := public.get_user_client_id(_user_id);
  v_is_super := public.is_super_admin(_user_id);

  SELECT c.enabled_modules INTO v_enabled_modules
  FROM public.clients c WHERE c.id = v_client_id;

  RETURN QUERY
  SELECT
    fd.feature_key,
    fd.module_key,
    CASE
      WHEN v_is_super THEN 'edit'::public.feature_access_level
      WHEN v_enabled_modules IS NOT NULL
        AND cardinality(v_enabled_modules) > 0
        AND NOT (fd.module_key = ANY(v_enabled_modules))
        THEN 'none'::public.feature_access_level
      WHEN ft.access_level IS NOT NULL THEN ft.access_level
      WHEN v_role IS NOT NULL AND v_role = ANY(fd.default_enabled_for_roles)
        THEN 'edit'::public.feature_access_level
      ELSE 'none'::public.feature_access_level
    END AS access_level
  FROM public.feature_definitions fd
  LEFT JOIN public.feature_toggles ft
    ON ft.feature_key = fd.feature_key
   AND ft.user_id = _user_id;
END;
$$;

-- 7. get_user_features uses the new function
CREATE OR REPLACE FUNCTION public.get_user_features(_user_id uuid)
RETURNS TABLE(feature_key text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    fa.feature_key,
    fa.access_level <> 'none'::public.feature_access_level AS enabled
  FROM public.get_user_feature_access(_user_id) fa;
$$;

-- 8. Keep is_enabled in sync with access_level
CREATE OR REPLACE FUNCTION public.sync_feature_toggle_enabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_enabled := NEW.access_level <> 'none'::public.feature_access_level;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feature_toggle_enabled ON public.feature_toggles;
CREATE TRIGGER trg_sync_feature_toggle_enabled
BEFORE INSERT OR UPDATE ON public.feature_toggles
FOR EACH ROW EXECUTE FUNCTION public.sync_feature_toggle_enabled();