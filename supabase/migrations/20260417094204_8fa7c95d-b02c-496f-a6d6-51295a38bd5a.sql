
-- ============ PAYROLL SETUPS ============
CREATE TABLE public.payroll_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  country text,
  currency text NOT NULL DEFAULT 'SAR',
  pay_frequency text NOT NULL DEFAULT 'monthly',
  year_end_date text DEFAULT '12-31',
  status text NOT NULL DEFAULT 'draft',
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX idx_payroll_setups_client ON public.payroll_setups(client_id);

ALTER TABLE public.payroll_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all payroll_setups" ON public.payroll_setups
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage payroll_setups in client" ON public.payroll_setups
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "users select payroll_setups in client" ON public.payroll_setups
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE TRIGGER trg_payroll_setups_updated
  BEFORE UPDATE ON public.payroll_setups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYROLL SETUP COMPONENTS ============
CREATE TABLE public.payroll_setup_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_setup_id uuid NOT NULL REFERENCES public.payroll_setups(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('earning', 'deduction')),
  calculation_type text NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed', 'percentage', 'formula')),
  value numeric NOT NULL DEFAULT 0,
  formula text,
  order_index int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_components_setup ON public.payroll_setup_components(payroll_setup_id);

ALTER TABLE public.payroll_setup_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all payroll_components" ON public.payroll_setup_components
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage payroll_components in client" ON public.payroll_setup_components
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "users select payroll_components in client" ON public.payroll_setup_components
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE TRIGGER trg_payroll_components_updated
  BEFORE UPDATE ON public.payroll_setup_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYROLL TAX RULES ============
CREATE TABLE public.payroll_setup_tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_setup_id uuid NOT NULL REFERENCES public.payroll_setups(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  slab_name text NOT NULL,
  income_from bigint NOT NULL DEFAULT 0,
  income_to bigint NOT NULL DEFAULT 9223372036854775807,
  percentage numeric NOT NULL DEFAULT 0,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_tax_setup ON public.payroll_setup_tax_rules(payroll_setup_id);

ALTER TABLE public.payroll_setup_tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all tax_rules" ON public.payroll_setup_tax_rules
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage tax_rules in client" ON public.payroll_setup_tax_rules
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "users select tax_rules in client" ON public.payroll_setup_tax_rules
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- ============ PAYROLL RUNS ============
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payroll_setup_id uuid REFERENCES public.payroll_setups(id) ON DELETE SET NULL,
  month text NOT NULL,
  year int NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross bigint NOT NULL DEFAULT 0,
  total_deductions bigint NOT NULL DEFAULT 0,
  total_net bigint NOT NULL DEFAULT 0,
  employee_count int NOT NULL DEFAULT 0,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  completed_at timestamptz,
  locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET DEFAULT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, payroll_setup_id, month, year)
);

CREATE INDEX idx_payroll_runs_client_period ON public.payroll_runs(client_id, year, month);
CREATE INDEX idx_payroll_runs_status ON public.payroll_runs(client_id, status);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all payroll_runs" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage payroll_runs in client" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE TRIGGER trg_payroll_runs_updated
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYROLL LINES ============
CREATE TABLE public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  basic bigint NOT NULL DEFAULT 0,
  allowances bigint NOT NULL DEFAULT 0,
  gross bigint NOT NULL DEFAULT 0,
  loan_deduction bigint NOT NULL DEFAULT 0,
  tax_deduction bigint NOT NULL DEFAULT 0,
  statutory_deduction bigint NOT NULL DEFAULT 0,
  other_deductions bigint NOT NULL DEFAULT 0,
  total_deductions bigint NOT NULL DEFAULT 0,
  expense_reimbursement bigint NOT NULL DEFAULT 0,
  advance_given bigint NOT NULL DEFAULT 0,
  one_off_benefits bigint NOT NULL DEFAULT 0,
  one_off_deductions bigint NOT NULL DEFAULT 0,
  separation_settlement bigint NOT NULL DEFAULT 0,
  net_pay bigint NOT NULL DEFAULT 0,
  pay_currency text NOT NULL DEFAULT 'SAR',
  exchange_rate numeric NOT NULL DEFAULT 1,
  net_in_reporting_currency bigint NOT NULL DEFAULT 0,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_lines_employee ON public.payroll_lines(employee_id, created_at DESC);
CREATE INDEX idx_payroll_lines_run ON public.payroll_lines(payroll_run_id);

ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all payroll_lines" ON public.payroll_lines
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage payroll_lines in client" ON public.payroll_lines
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "employee select own payroll_lines" ON public.payroll_lines
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ============ PAYROLL ONE-OFF ADJUSTMENTS ============
CREATE TABLE public.payroll_one_off_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('benefit', 'deduction')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_one_off_run ON public.payroll_one_off_adjustments(payroll_run_id, employee_id);

ALTER TABLE public.payroll_one_off_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin all one_off" ON public.payroll_one_off_adjustments
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr manage one_off in client" ON public.payroll_one_off_adjustments
  FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "employee select own one_off" ON public.payroll_one_off_adjustments
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ============ PAYSLIPS ============
CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_line_id uuid NOT NULL REFERENCES public.payroll_lines(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pdf_url text,
  issued_at timestamptz,
  viewed_by_employee_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payslips_employee ON public.payslips(employee_id, created_at DESC);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin select payslips" ON public.payslips
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "admin/hr select payslips in client" ON public.payslips
  FOR SELECT TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "employee select own payslips" ON public.payslips
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- Note: INSERT/UPDATE on payslips intentionally restricted to service role only
-- (no policies = no access; edge functions using service role bypass RLS)
