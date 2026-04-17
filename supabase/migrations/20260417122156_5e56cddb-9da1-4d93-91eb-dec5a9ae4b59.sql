-- Performance indexes for hot read paths
CREATE INDEX IF NOT EXISTS idx_employees_client_status ON public.employees(client_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON public.employees(reports_to);

CREATE INDEX IF NOT EXISTS idx_expenses_client_employee_status ON public.expenses(client_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_client_status_date ON public.expenses(client_id, status, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_client_created ON public.audit_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_client_status ON public.assets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_employee ON public.assets(employee_id);

CREATE INDEX IF NOT EXISTS idx_advances_client_status ON public.advances(client_id, status);
CREATE INDEX IF NOT EXISTS idx_advances_employee ON public.advances(employee_id);

CREATE INDEX IF NOT EXISTS idx_cost_alloc_employee_year_month ON public.cost_allocations(employee_id, year, month);

CREATE INDEX IF NOT EXISTS idx_emp_compensation_employee ON public.employee_compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_documents_employee ON public.employee_documents(employee_id);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset_date ON public.asset_history(asset_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_requests_client_status ON public.asset_requests(client_id, status);

CREATE INDEX IF NOT EXISTS idx_company_policies_client_status ON public.company_policies(client_id, status);

CREATE INDEX IF NOT EXISTS idx_feature_toggles_user ON public.feature_toggles(user_id);