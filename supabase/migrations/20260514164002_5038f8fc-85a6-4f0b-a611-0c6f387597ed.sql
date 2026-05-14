
-- ============================================================
-- TABLE 1: tab_definitions (global master list)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tab_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  tab_key text NOT NULL UNIQUE,
  label text NOT NULL,
  path text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('people_only','both')),
  default_for_admin boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tab definitions readable by authenticated"
  ON public.tab_definitions FOR SELECT TO authenticated USING (true);

-- Seed tab_definitions
INSERT INTO public.tab_definitions (module_key, tab_key, label, path, scope, default_for_admin, sort_order) VALUES
  ('employees','employees.directory','Directory','/employees','people_only',true,1),
  ('employees','employees.org_chart','Org Chart','/org-chart','both',true,2),
  ('employees','employees.imp_dates','Imp Dates','/birthdays','people_only',true,3),
  ('employees','employees.leave_mgmt','Leave Management','/leave','people_only',true,4),
  ('employees','employees.id_cards','Employee Cards','/id-cards','people_only',true,5),
  ('employees','employees.hr_settings','HR Settings','/employees/settings','people_only',true,6),
  ('payroll','payroll.setup','Payroll Setup','/payroll/setup','people_only',true,1),
  ('payroll','payroll.runs','Payroll Runs','/payroll','people_only',true,2),
  ('payroll','payroll.payslips','Payslips','/payslips','both',true,3),
  ('payroll','payroll.eos','End of Service','/separations','people_only',true,4),
  ('payroll','payroll.loans','Loans','/loans','both',true,5),
  ('payroll','payroll.analytics','Analytics','/analytics','people_only',true,6),
  ('payroll','payroll.settings','Payroll Settings','/payroll/settings','people_only',true,7),
  ('expenses','expenses.claims','Expenses','/expenses','both',true,1),
  ('expenses','expenses.advances','Advances','/advances','both',true,2),
  ('expenses','expenses.outstanding','Outstanding Advances','/outstanding-advances','people_only',true,3),
  ('expenses','expenses.analytics','Expense Analytics','/expense-analytics','people_only',true,4),
  ('expenses','expenses.settings','Expense Settings','/expenses/settings','people_only',true,5),
  ('assets','assets.dashboard','Dashboard','/assets/dashboard','people_only',true,1),
  ('assets','assets.inventory','Asset Inventory','/assets/inventory','both',true,2),
  ('assets','assets.store','Asset Store','/assets/store','both',true,3),
  ('assets','assets.requests','Asset Requests','/assets/requests','people_only',true,4),
  ('assets','assets.audits','Asset Audits','/assets/audits','people_only',true,5),
  ('assets','assets.settings','Asset Settings','/assets/master-data','people_only',true,6),
  ('performance','performance.ratings','Ratings Overview','/performance/ratings','people_only',true,1),
  ('performance','performance.calibration','Rating Calibration','/performance/calibration','people_only',true,2),
  ('performance','performance.self','Self Assessment','/performance/self-assessment','both',true,3),
  ('performance','performance.peer','Peer Assessment','/performance/peer-assessment','both',true,4),
  ('performance','performance.manager','Manager Assessment','/performance/manager-assessment','people_only',true,5),
  ('performance','performance.assessment_ratings','Assessment Ratings','/performance/assessment-ratings','people_only',true,6),
  ('performance','performance.questionnaire','Questionnaire Settings','/performance/questionnaire','people_only',true,7),
  ('projects','projects.list','Projects','/projects','people_only',true,1),
  ('reports','reports.all','Reports','/reports','people_only',true,1)
ON CONFLICT (tab_key) DO NOTHING;

-- ============================================================
-- TABLE 2: client_tab_access
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_tab_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tab_key text NOT NULL REFERENCES public.tab_definitions(tab_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, tab_key)
);

CREATE INDEX IF NOT EXISTS idx_client_tab_access_client ON public.client_tab_access(client_id);

ALTER TABLE public.client_tab_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own client tab access"
  ON public.client_tab_access FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin manages client tab access"
  ON public.client_tab_access FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- TABLE 3: role_tab_access
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_tab_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  tab_key text NOT NULL REFERENCES public.tab_definitions(tab_key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, tab_key)
);

CREATE INDEX IF NOT EXISTS idx_role_tab_access_role ON public.role_tab_access(role_id);

ALTER TABLE public.role_tab_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read role tab access in own client"
  ON public.role_tab_access FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_tab_access.role_id
        AND r.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Admin/HR manage role tab access in own client"
  ON public.role_tab_access FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_tab_access.role_id
        AND public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_tab_access.role_id
        AND public.is_admin_or_hr_in_client(auth.uid(), r.client_id)
    )
  );

-- ============================================================
-- clients.enabled_module_keys (additive; keeps existing enabled_modules)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS enabled_module_keys text[];

-- ============================================================
-- FUNCTION: seed_client_tab_access
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_client_tab_access(_client_id uuid, _module_keys text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_tab_access (client_id, tab_key, enabled)
  SELECT _client_id, td.tab_key, true
  FROM public.tab_definitions td
  WHERE td.module_key = ANY(_module_keys)
  ON CONFLICT (client_id, tab_key) DO UPDATE SET enabled = true;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_client_tab_access(uuid, text[]) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_client_tab_access(uuid, text[]) TO service_role;

-- ============================================================
-- TRIGGER: auto-grant client tabs to Admin role
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_tab_to_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE client_id = NEW.client_id
    AND is_system = true
    AND name = 'Admin'
  LIMIT 1;

  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_tab_access (role_id, tab_key, enabled)
    VALUES (v_admin_role_id, NEW.tab_key, true)
    ON CONFLICT (role_id, tab_key) DO UPDATE SET enabled = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_tab_to_admin ON public.client_tab_access;
CREATE TRIGGER trg_grant_tab_to_admin
  AFTER INSERT ON public.client_tab_access
  FOR EACH ROW EXECUTE FUNCTION public.grant_tab_to_admin_role();

-- ============================================================
-- FUNCTION: get_user_accessible_tabs
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_accessible_tabs(_user_id uuid)
RETURNS TABLE(tab_key text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      SELECT cta.tab_key
      FROM public.client_tab_access cta
      WHERE cta.client_id = v_client_id AND cta.enabled = true;
    RETURN;
  END IF;

  SELECT public.get_employee_role_id(_user_id) INTO v_emp_role_id;

  RETURN QUERY
    SELECT rta.tab_key
    FROM public.role_tab_access rta
    JOIN public.client_tab_access cta
      ON cta.tab_key = rta.tab_key
     AND cta.client_id = v_client_id
     AND cta.enabled = true
    WHERE rta.role_id = v_emp_role_id
      AND rta.enabled = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_tabs(uuid) TO authenticated;
