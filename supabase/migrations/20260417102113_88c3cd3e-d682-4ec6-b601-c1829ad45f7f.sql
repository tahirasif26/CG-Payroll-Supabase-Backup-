-- ============================================================
-- STEP 12: Migrate remaining modules to database
-- ============================================================

-- ===== EXPENSES =====
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  gl_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  receipt_url text,
  status text NOT NULL DEFAULT 'draft',
  project_id uuid,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  paid_date date,
  payment_method text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_employee ON public.expenses(employee_id);
CREATE INDEX idx_expenses_client_status ON public.expenses(client_id, status);

CREATE TABLE public.expense_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  status text NOT NULL,
  comments text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mileage_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  distance_km numeric NOT NULL DEFAULT 0,
  rate_per_km numeric NOT NULL DEFAULT 0,
  amount bigint NOT NULL DEFAULT 0,
  vehicle_type text,
  from_address text,
  to_address text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  repayment_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== ASSETS =====
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

CREATE TABLE public.asset_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_tag text NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  brand text,
  model text,
  serial_number text,
  condition_id uuid REFERENCES public.asset_conditions(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.asset_locations(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_date date,
  status text NOT NULL DEFAULT 'available',
  purchase_date date,
  purchase_cost bigint DEFAULT 0,
  warranty_expiry date,
  service_due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, asset_tag)
);

CREATE TABLE public.asset_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  to_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  brand text,
  model text,
  description text,
  image_url text,
  sku text,
  estimated_cost bigint DEFAULT 0,
  warranty_period text,
  specifications text,
  publish_to_store boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  store_item_id uuid REFERENCES public.asset_store_items(id) ON DELETE SET NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  scope_value text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'in-progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_audit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.asset_audits(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  verification text NOT NULL DEFAULT 'pending',
  verified_by uuid,
  verified_date timestamptz,
  notes text
);

-- ===== LEAVE =====
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  days_per_year numeric NOT NULL DEFAULT 0,
  accrual_type text NOT NULL DEFAULT 'annual',
  max_carryforward numeric NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  gender_specific text,
  is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);

CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year int NOT NULL,
  allocated numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  carryforward_in numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  is_optional boolean NOT NULL DEFAULT false,
  applies_to_locations text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== LOANS =====
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  principal bigint NOT NULL DEFAULT 0,
  remaining_balance bigint NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  monthly_deduction bigint NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  reason text,
  paused_until date,
  pre_pause_emi bigint,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loan_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  balance_after bigint NOT NULL DEFAULT 0,
  emi_at_time bigint NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== PERFORMANCE =====
CREATE TABLE public.performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.performance_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.performance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id uuid,
  type text NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  rating numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.performance_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  original_rating numeric,
  calibrated_rating numeric,
  notes text,
  calibrated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== SEPARATIONS =====
CREATE TABLE public.separations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  last_working_date date NOT NULL,
  reason text,
  type text NOT NULL DEFAULT 'resignation',
  notice_period_days int NOT NULL DEFAULT 0,
  notice_period_served boolean NOT NULL DEFAULT false,
  unpaid_salary bigint NOT NULL DEFAULT 0,
  eosb_amount bigint NOT NULL DEFAULT 0,
  eosb_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  leave_encashment bigint NOT NULL DEFAULT 0,
  notice_period_pay bigint NOT NULL DEFAULT 0,
  loan_deduction bigint NOT NULL DEFAULT 0,
  total_settlement bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  approved_by uuid,
  processed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== PROJECTS & TIMESHEETS =====
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  client_name text,
  budget bigint NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  completion numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, code)
);

CREATE TABLE public.project_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  week_starting date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  month text NOT NULL,
  year int NOT NULL,
  allocation numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== POLICIES =====
CREATE TABLE public.company_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  file_name text,
  file_url text,
  version int NOT NULL DEFAULT 1,
  versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  requires_ack boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.policy_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.company_policies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_id, employee_id)
);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category text NOT NULL,
  days_before int NOT NULL DEFAULT 7,
  is_enabled boolean NOT NULL DEFAULT true,
  channels text[] NOT NULL DEFAULT ARRAY['email']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, category)
);

-- ============================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.separations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STANDARD POLICIES PER TABLE
-- Pattern: super_admin all, admin/hr in client all, scoped employee SELECT
-- ============================================================

-- Helper macro pattern applied per table:
-- 1. super admin ALL
-- 2. admin/hr ALL in client
-- 3. (where applicable) employee SELECT/INSERT/UPDATE own rows

-- expense_categories: client-wide read, admin/hr manage
CREATE POLICY "super_admin all expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select expense_categories" ON public.expense_categories FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- expenses
CREATE POLICY "super_admin all expenses" ON public.expenses FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage expenses" ON public.expenses FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own expenses" ON public.expenses FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee update own draft expenses" ON public.expenses FOR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND status = 'draft') WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- expense_approvals
CREATE POLICY "super_admin all expense_approvals" ON public.expense_approvals FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage expense_approvals" ON public.expense_approvals FOR ALL TO authenticated USING (expense_id IN (SELECT id FROM expenses WHERE is_admin_or_hr_in_client(auth.uid(), client_id))) WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE is_admin_or_hr_in_client(auth.uid(), client_id)));

-- mileage_entries
CREATE POLICY "super_admin all mileage" ON public.mileage_entries FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage mileage" ON public.mileage_entries FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own mileage" ON public.mileage_entries FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own mileage" ON public.mileage_entries FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- advances
CREATE POLICY "super_admin all advances" ON public.advances FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage advances" ON public.advances FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own advances" ON public.advances FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own advances" ON public.advances FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- asset_categories
CREATE POLICY "super_admin all asset_categories" ON public.asset_categories FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_categories" ON public.asset_categories FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select asset_categories" ON public.asset_categories FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- asset_conditions
CREATE POLICY "super_admin all asset_conditions" ON public.asset_conditions FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_conditions" ON public.asset_conditions FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select asset_conditions" ON public.asset_conditions FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- asset_locations
CREATE POLICY "super_admin all asset_locations" ON public.asset_locations FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_locations" ON public.asset_locations FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select asset_locations" ON public.asset_locations FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- assets
CREATE POLICY "super_admin all assets" ON public.assets FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage assets" ON public.assets FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select assets in client" ON public.assets FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- asset_history
CREATE POLICY "super_admin all asset_history" ON public.asset_history FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_history" ON public.asset_history FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select asset_history" ON public.asset_history FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- asset_store_items
CREATE POLICY "super_admin all asset_store_items" ON public.asset_store_items FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_store_items" ON public.asset_store_items FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select asset_store_items" ON public.asset_store_items FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- asset_requests
CREATE POLICY "super_admin all asset_requests" ON public.asset_requests FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_requests" ON public.asset_requests FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own asset_requests" ON public.asset_requests FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own asset_requests" ON public.asset_requests FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- asset_audits
CREATE POLICY "super_admin all asset_audits" ON public.asset_audits FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_audits" ON public.asset_audits FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- asset_audit_entries
CREATE POLICY "super_admin all asset_audit_entries" ON public.asset_audit_entries FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage asset_audit_entries" ON public.asset_audit_entries FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- leave_types
CREATE POLICY "super_admin all leave_types" ON public.leave_types FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage leave_types" ON public.leave_types FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select leave_types" ON public.leave_types FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- leave_balances
CREATE POLICY "super_admin all leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- leave_requests
CREATE POLICY "super_admin all leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own leave_requests" ON public.leave_requests FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own leave_requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee update own pending leave" ON public.leave_requests FOR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND status = 'pending') WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- holidays
CREATE POLICY "super_admin all holidays" ON public.holidays FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage holidays" ON public.holidays FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select holidays" ON public.holidays FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- loans
CREATE POLICY "super_admin all loans" ON public.loans FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage loans" ON public.loans FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own loans" ON public.loans FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- loan_transactions
CREATE POLICY "super_admin all loan_transactions" ON public.loan_transactions FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage loan_transactions" ON public.loan_transactions FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own loan_transactions" ON public.loan_transactions FOR SELECT TO authenticated USING (loan_id IN (SELECT id FROM loans WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));

-- performance_cycles
CREATE POLICY "super_admin all perf_cycles" ON public.performance_cycles FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage perf_cycles" ON public.performance_cycles FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select perf_cycles" ON public.performance_cycles FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- performance_questionnaires
CREATE POLICY "super_admin all perf_q" ON public.performance_questionnaires FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage perf_q" ON public.performance_questionnaires FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select perf_q" ON public.performance_questionnaires FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- performance_assessments
CREATE POLICY "super_admin all perf_assess" ON public.performance_assessments FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage perf_assess" ON public.performance_assessments FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own perf_assess" ON public.performance_assessments FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR reviewer_id = auth.uid());
CREATE POLICY "reviewer update perf_assess" ON public.performance_assessments FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());

-- performance_calibrations
CREATE POLICY "super_admin all perf_cal" ON public.performance_calibrations FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage perf_cal" ON public.performance_calibrations FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- separations
CREATE POLICY "super_admin all separations" ON public.separations FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage separations" ON public.separations FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own separation" ON public.separations FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- projects
CREATE POLICY "super_admin all projects" ON public.projects FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage projects" ON public.projects FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select projects" ON public.projects FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- project_team_members
CREATE POLICY "super_admin all team_members" ON public.project_team_members FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage team_members" ON public.project_team_members FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select team_members" ON public.project_team_members FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- timesheets
CREATE POLICY "super_admin all timesheets" ON public.timesheets FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage timesheets" ON public.timesheets FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own timesheets" ON public.timesheets FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own timesheets" ON public.timesheets FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee update own draft timesheets" ON public.timesheets FOR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND status = 'draft') WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- cost_allocations
CREATE POLICY "super_admin all cost_alloc" ON public.cost_allocations FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage cost_alloc" ON public.cost_allocations FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own cost_alloc" ON public.cost_allocations FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- company_policies
CREATE POLICY "super_admin all policies" ON public.company_policies FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage policies" ON public.company_policies FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select policies" ON public.company_policies FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- policy_acknowledgements
CREATE POLICY "super_admin all policy_ack" ON public.policy_acknowledgements FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr select policy_ack" ON public.policy_acknowledgements FOR SELECT TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own ack" ON public.policy_acknowledgements FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "employee insert own ack" ON public.policy_acknowledgements FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- notifications
CREATE POLICY "super_admin all notifications" ON public.notifications FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "user select own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin/hr insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- reminder_settings
CREATE POLICY "super_admin all reminder_settings" ON public.reminder_settings FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr manage reminder_settings" ON public.reminder_settings FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id)) WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "users select reminder_settings" ON public.reminder_settings FOR SELECT TO authenticated USING (client_id = get_user_client_id(auth.uid()));

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mileage_updated BEFORE UPDATE ON public.mileage_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_advances_updated BEFORE UPDATE ON public.advances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_asset_requests_updated BEFORE UPDATE ON public.asset_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leave_balances_updated BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leave_requests_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_perf_assess_updated BEFORE UPDATE ON public.performance_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_separations_updated BEFORE UPDATE ON public.separations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_timesheets_updated BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_policies_updated BEFORE UPDATE ON public.company_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reminder_settings_updated BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();