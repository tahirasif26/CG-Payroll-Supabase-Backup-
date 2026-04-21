
-- =========================================================================
-- 1. Convert all existing HR users to employees (preserve their client_id)
-- =========================================================================
UPDATE public.user_roles
SET role = 'employee'::public.app_role
WHERE role = 'hr'::public.app_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = public.user_roles.user_id
      AND ur2.role = 'employee'::public.app_role
  );

DELETE FROM public.user_roles WHERE role = 'hr'::public.app_role;

-- =========================================================================
-- 2. Drop ALL objects that depend on the old enum
-- =========================================================================
DROP POLICY IF EXISTS "Admin HR view all receipts" ON storage.objects;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_hr_in_client(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_client_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_feature(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_feature_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_features(uuid) CASCADE;

-- =========================================================================
-- 3. Recreate the app_role enum WITHOUT 'hr'
-- =========================================================================
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'employee');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

DROP TYPE public.app_role_old CASCADE;

-- =========================================================================
-- 4. Recreate helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 0
    WHEN 'admin' THEN 1
    WHEN 'employee' THEN 2
  END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT client_id FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('admin', 'employee')
    AND client_id IS NOT NULL
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'employee' THEN 2 END
  LIMIT 1;
$$;

-- Kept under the old name so existing RLS policies continue to work.
-- Now collapses to "is admin in this client".
CREATE OR REPLACE FUNCTION public.is_admin_or_hr_in_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT _client_id = public.get_user_client_id(_user_id)
    AND public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.has_feature(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_is_super boolean;
  v_toggle boolean;
  v_role public.app_role;
  v_defaults text[];
BEGIN
  SELECT public.is_super_admin(_user_id) INTO v_is_super;
  IF v_is_super THEN RETURN true; END IF;

  SELECT is_enabled INTO v_toggle
  FROM public.feature_toggles
  WHERE user_id = _user_id AND feature_key = _feature_key
  LIMIT 1;
  IF FOUND THEN RETURN v_toggle; END IF;

  SELECT public.get_user_role(_user_id) INTO v_role;
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT default_enabled_for_roles INTO v_defaults
  FROM public.feature_definitions
  WHERE feature_key = _feature_key
  LIMIT 1;

  IF v_defaults IS NULL THEN RETURN false; END IF;
  RETURN v_role::text = ANY (v_defaults);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_feature_access(_user_id uuid)
RETURNS TABLE(feature_key text, module_key text, access_level public.feature_access_level)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
      WHEN v_role = 'admin' THEN 'edit'::public.feature_access_level
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
    ON ft.feature_key = fd.feature_key AND ft.user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_features(_user_id uuid)
RETURNS TABLE(feature_key text, enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT fa.feature_key,
         fa.access_level <> 'none'::public.feature_access_level AS enabled
  FROM public.get_user_feature_access(_user_id) fa;
$$;

-- =========================================================================
-- 5. Enforce "exactly one admin per client" via trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_single_admin_per_client()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'admin'::public.app_role AND NEW.client_id IS NOT NULL THEN
    UPDATE public.user_roles
       SET role = 'employee'::public.app_role
     WHERE client_id = NEW.client_id
       AND role = 'admin'::public.app_role
       AND user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_admin_per_client ON public.user_roles;
CREATE TRIGGER trg_single_admin_per_client
AFTER INSERT OR UPDATE OF role, client_id ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_admin_per_client();

-- =========================================================================
-- 6. Recreate the storage policy (admin only now, since hr is gone)
-- =========================================================================
CREATE POLICY "Admin view all receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('receipts', 'expense-receipts')
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- =========================================================================
-- 7. Strip 'hr' from feature_definitions.default_enabled_for_roles
-- =========================================================================
UPDATE public.feature_definitions
SET default_enabled_for_roles = ARRAY(
  SELECT unnest(default_enabled_for_roles) EXCEPT SELECT 'hr'
)
WHERE 'hr' = ANY(default_enabled_for_roles);

-- =========================================================================
-- 8. Recompile seed_default_feature_preset against new enum
-- =========================================================================
CREATE OR REPLACE FUNCTION public.seed_default_feature_preset()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_toggles jsonb;
BEGIN
  SELECT COALESCE(
           jsonb_object_agg(feature_key, ('employee' = ANY(default_enabled_for_roles))),
           '{}'::jsonb)
  INTO v_toggles
  FROM public.feature_definitions;

  INSERT INTO public.feature_presets (client_id, name, description, toggles, is_default)
  VALUES (NEW.id, 'Standard Employee', 'Default features for regular employees',
          COALESCE(v_toggles, '{}'::jsonb), true)
  ON CONFLICT (client_id, name) DO NOTHING;

  RETURN NEW;
END;
$$;
