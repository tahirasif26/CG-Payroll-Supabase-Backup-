
DELETE FROM public.role_features
 WHERE feature_key IN ('payroll.approve_run', 'timesheets.approve');

DELETE FROM public.feature_toggles
 WHERE feature_key IN ('payroll.approve_run', 'timesheets.approve');

DELETE FROM public.feature_definitions
 WHERE feature_key IN ('payroll.approve_run', 'timesheets.approve');

DELETE FROM public.approval_policies
 WHERE category IN ('payroll', 'timesheets');
