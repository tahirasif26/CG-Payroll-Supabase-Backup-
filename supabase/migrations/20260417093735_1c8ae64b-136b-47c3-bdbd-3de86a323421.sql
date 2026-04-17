
-- ========== AUDIT LOGS ==========
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  user_role text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  entity_label text,
  before_value jsonb,
  after_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_client_created ON public.audit_logs(client_id, created_at DESC);
CREATE INDEX idx_audit_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin select audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr select audit in client" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr')));
CREATE POLICY "employee select own audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "authenticated insert audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ========== APPROVAL ROLES ==========
CREATE TABLE public.approval_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  expense_approval_limit bigint NOT NULL DEFAULT 0,
  can_approve_hr boolean NOT NULL DEFAULT false,
  can_approve_payroll boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
CREATE INDEX idx_appr_roles_client ON public.approval_roles(client_id);

ALTER TABLE public.approval_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all approval roles" ON public.approval_roles
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "users select approval roles in client" ON public.approval_roles
  FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));
CREATE POLICY "admin manage approval roles" ON public.approval_roles
  FOR ALL TO authenticated
  USING (client_id = get_user_client_id(auth.uid()) AND has_role(auth.uid(), 'admin'))
  WITH CHECK (client_id = get_user_client_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- ========== APPROVAL ROLE ASSIGNMENTS ==========
CREATE TABLE public.user_approval_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.approval_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
CREATE INDEX idx_appr_assign_client_user ON public.user_approval_role_assignments(client_id, user_id);

ALTER TABLE public.user_approval_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all assignments" ON public.user_approval_role_assignments
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "users select assignments in client" ON public.user_approval_role_assignments
  FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));
CREATE POLICY "admin manage assignments" ON public.user_approval_role_assignments
  FOR ALL TO authenticated
  USING (client_id = get_user_client_id(auth.uid()) AND has_role(auth.uid(), 'admin'))
  WITH CHECK (client_id = get_user_client_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- ========== GL CODE MAPPINGS ==========
CREATE TABLE public.gl_code_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_name text NOT NULL,
  gl_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, entry_name)
);
CREATE INDEX idx_gl_client ON public.gl_code_mappings(client_id);

ALTER TABLE public.gl_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all gl" ON public.gl_code_mappings
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage gl in client" ON public.gl_code_mappings
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- ========== TRIGGERS: updated_at ==========
CREATE TRIGGER trg_appr_roles_updated_at BEFORE UPDATE ON public.approval_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_gl_updated_at BEFORE UPDATE ON public.gl_code_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== AUTO-SEED DEFAULT APPROVAL ROLES ON NEW CLIENT ==========
CREATE OR REPLACE FUNCTION public.seed_default_approval_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.approval_roles (client_id, name, expense_approval_limit, can_approve_hr, can_approve_payroll) VALUES
    (NEW.id, 'Department Manager', 500000, false, false),
    (NEW.id, 'Finance Head', 5000000, false, false),
    (NEW.id, 'HR Manager', 0, true, false),
    (NEW.id, 'Payroll Manager', 0, false, true),
    (NEW.id, 'Admin', 9223372036854775807, true, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_approval_roles
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.seed_default_approval_roles();

-- Backfill existing clients
INSERT INTO public.approval_roles (client_id, name, expense_approval_limit, can_approve_hr, can_approve_payroll)
SELECT c.id, v.name, v.lim, v.hr, v.pay
FROM public.clients c
CROSS JOIN (VALUES
  ('Department Manager', 500000::bigint, false, false),
  ('Finance Head', 5000000::bigint, false, false),
  ('HR Manager', 0::bigint, true, false),
  ('Payroll Manager', 0::bigint, false, true),
  ('Admin', 9223372036854775807::bigint, true, true)
) AS v(name, lim, hr, pay)
ON CONFLICT (client_id, name) DO NOTHING;
