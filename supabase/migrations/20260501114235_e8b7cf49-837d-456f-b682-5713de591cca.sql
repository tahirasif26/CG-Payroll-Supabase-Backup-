INSERT INTO public.feature_definitions (feature_key, module, module_key, name, description, default_enabled_for_roles) VALUES
  ('audit.view', 'Audit & Compliance', 'audit', 'View Audit Trail', 'See system change history with before/after values', ARRAY['admin','hr']),
  ('reports.view', 'Reports & Exports', 'reports', 'View Reports', 'Export payroll, leave balance, and headcount reports', ARRAY['admin','hr'])
ON CONFLICT (feature_key) DO NOTHING;