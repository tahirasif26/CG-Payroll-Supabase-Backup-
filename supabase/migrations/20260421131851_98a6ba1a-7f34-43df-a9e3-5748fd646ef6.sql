-- Performance indexes for hot-path queries

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_client_status ON public.employees(client_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_client_email ON public.employees(client_id, email);
CREATE INDEX IF NOT EXISTS idx_employees_client_department ON public.employees(client_id, department) WHERE department IS NOT NULL;

-- Payroll
CREATE INDEX IF NOT EXISTS idx_payroll_runs_client_period ON public.payroll_runs(client_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_client_status ON public.payroll_runs(client_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON public.payroll_lines(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee ON public.payroll_lines(employee_id, created_at DESC);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_client_status ON public.expenses(client_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON public.expenses(employee_id, status, expense_date DESC);

-- Leave
CREATE INDEX IF NOT EXISTS idx_leave_requests_client_status ON public.leave_requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_lookup ON public.leave_balances(employee_id, year);

-- Assets
CREATE INDEX IF NOT EXISTS idx_assets_client_status ON public.assets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_employee ON public.assets(employee_id) WHERE employee_id IS NOT NULL;

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_created ON public.audit_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Feature toggles (hot path)
CREATE INDEX IF NOT EXISTS idx_feature_toggles_user_key ON public.feature_toggles(user_id, feature_key);

-- User roles (hot path)
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- Notifications (unread = read_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Advances
CREATE INDEX IF NOT EXISTS idx_advances_client_status ON public.advances(client_id, status);
CREATE INDEX IF NOT EXISTS idx_advances_employee ON public.advances(employee_id, status);

-- Org structure
CREATE INDEX IF NOT EXISTS idx_departments_client ON public.departments(client_id);
CREATE INDEX IF NOT EXISTS idx_designations_client ON public.designations(client_id);
