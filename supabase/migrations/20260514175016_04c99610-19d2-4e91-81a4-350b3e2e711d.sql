
-- Drop trigger first so renaming the column doesn't break inserts
DROP TRIGGER IF EXISTS trg_grant_tab_to_admin_role ON public.client_tab_access;

-- Rename column
ALTER TABLE public.role_tab_access RENAME COLUMN enabled TO people_enabled;

-- Recreate trigger function with new column name
CREATE OR REPLACE FUNCTION public.grant_tab_to_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE client_id = NEW.client_id AND is_system = true AND name = 'Admin'
  LIMIT 1;

  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_tab_access (role_id, tab_key, people_enabled)
    VALUES (v_admin_role_id, NEW.tab_key, true)
    ON CONFLICT (role_id, tab_key) DO UPDATE SET people_enabled = true;
  END IF;
  RETURN NEW;
END;
$fn$;

-- Re-attach trigger
CREATE TRIGGER trg_grant_tab_to_admin_role
AFTER INSERT ON public.client_tab_access
FOR EACH ROW EXECUTE FUNCTION public.grant_tab_to_admin_role();

-- Add 6 settings tabs to global tab_definitions
INSERT INTO public.tab_definitions (module_key, tab_key, label, path, scope, default_for_admin, sort_order) VALUES
  ('settings', 'settings.company_profile',   'Company Profile',    '/settings/company',          'people_only', true, 1),
  ('settings', 'settings.user_permissions',  'User Permissions',   '/settings/user-permissions', 'people_only', true, 2),
  ('settings', 'settings.approval_matrix',   'Approval Matrix',    '/settings/approval-matrix',  'people_only', true, 3),
  ('settings', 'settings.policies',          'Policies',           '/settings/policies',         'people_only', true, 4),
  ('settings', 'settings.audit_trail',       'Audit Trail',        '/settings/audit-trail',      'people_only', true, 5),
  ('settings', 'settings.visual',            'Visual Preferences', '/settings/visual',           'people_only', true, 6)
ON CONFLICT (tab_key) DO UPDATE
  SET module_key = EXCLUDED.module_key, label = EXCLUDED.label,
      path = EXCLUDED.path, scope = EXCLUDED.scope, sort_order = EXCLUDED.sort_order;

-- Backfill client_tab_access for all existing clients with settings tabs
INSERT INTO public.client_tab_access (client_id, tab_key, enabled)
SELECT c.id, td.tab_key, true
FROM public.clients c
CROSS JOIN public.tab_definitions td
WHERE td.module_key = 'settings'
ON CONFLICT (client_id, tab_key) DO UPDATE SET enabled = true;

-- Update seed_client_tab_access to always include settings
CREATE OR REPLACE FUNCTION public.seed_client_tab_access(_client_id uuid, _module_keys text[])
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  INSERT INTO public.client_tab_access (client_id, tab_key, enabled)
  SELECT _client_id, td.tab_key, true
  FROM public.tab_definitions td
  WHERE td.module_key = ANY(_module_keys) OR td.module_key = 'settings'
  ON CONFLICT (client_id, tab_key) DO UPDATE SET enabled = true;
END;
$fn$;

-- Backfill admin role with all client-enabled tabs
INSERT INTO public.role_tab_access (role_id, tab_key, people_enabled)
SELECT r.id, cta.tab_key, true
FROM public.roles r
JOIN public.client_tab_access cta ON cta.client_id = r.client_id AND cta.enabled = true
WHERE r.is_system = true AND r.name = 'Admin'
ON CONFLICT (role_id, tab_key) DO UPDATE SET people_enabled = true;

-- Update get_user_accessible_tabs to also return scope
DROP FUNCTION IF EXISTS public.get_user_accessible_tabs(uuid);

CREATE OR REPLACE FUNCTION public.get_user_accessible_tabs(_user_id uuid)
 RETURNS TABLE(tab_key text, scope text, people_enabled boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_client_id uuid;
  v_role public.app_role;
  v_emp_role_id uuid;
BEGIN
  v_client_id := public.get_user_client_id(_user_id);
  v_role := public.get_user_role(_user_id);

  IF v_client_id IS NULL THEN RETURN; END IF;

  IF v_role = 'admin' OR public.is_super_admin(_user_id) THEN
    RETURN QUERY
      SELECT td.tab_key, td.scope, true AS people_enabled
      FROM public.client_tab_access cta
      JOIN public.tab_definitions td ON td.tab_key = cta.tab_key
      WHERE cta.client_id = v_client_id AND cta.enabled = true;
    RETURN;
  END IF;

  SELECT public.get_employee_role_id(_user_id) INTO v_emp_role_id;

  RETURN QUERY
    SELECT td.tab_key, td.scope, COALESCE(rta.people_enabled, false) AS people_enabled
    FROM public.client_tab_access cta
    JOIN public.tab_definitions td ON td.tab_key = cta.tab_key
    LEFT JOIN public.role_tab_access rta
      ON rta.tab_key = cta.tab_key AND rta.role_id = v_emp_role_id
    WHERE cta.client_id = v_client_id
      AND cta.enabled = true
      AND (td.scope = 'both' OR COALESCE(rta.people_enabled, false) = true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_tabs(uuid) TO authenticated;
