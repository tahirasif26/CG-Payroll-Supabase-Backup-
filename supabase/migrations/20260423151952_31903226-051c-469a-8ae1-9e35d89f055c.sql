DO $$
DECLARE
  v_client RECORD;
  v_old TEXT;
  v_new TEXT[];
  v_map JSONB := jsonb_build_object(
    'employees.directory',          jsonb_build_array('employees.view_directory','employees.add','employees.edit'),
    'employees.org_chart',          jsonb_build_array('employees.view_org_chart'),
    'employees.important_dates',    jsonb_build_array('employees.view_birthdays'),
    'employees.leave',              jsonb_build_array('leave.view_balance','leave.apply','leave.approve'),
    'payroll.setup',                jsonb_build_array('payroll.create_run'),
    'payroll.runs',                 jsonb_build_array('payroll.view_all_runs','payroll.approve_run'),
    'payroll.payslips',             jsonb_build_array('payroll.view_own_payslip','payroll.download_payslip','payroll.view_salary_breakdown'),
    'payroll.end_of_service',       jsonb_build_array('payroll.view_all_runs'),
    'payroll.loans',                jsonb_build_array('loans.view_own','loans.request','loans.approve','loans.view_all'),
    'payroll.analytics',            jsonb_build_array('payroll.export_csv'),
    'expenses.list',                jsonb_build_array('expenses.view_own','expenses.submit','expenses.view_all','expenses.approve','expenses.mileage_submit'),
    'expenses.advances',            jsonb_build_array('advances.view_own','advances.request','advances.approve'),
    'expenses.outstanding',         jsonb_build_array('advances.approve'),
    'expenses.analytics',           jsonb_build_array('expenses.view_all'),
    'assets.dashboard',             jsonb_build_array('assets.view_inventory'),
    'assets.inventory',             jsonb_build_array('assets.view_inventory','assets.manage'),
    'assets.settings',              jsonb_build_array('assets.manage'),
    'assets.store',                 jsonb_build_array('assets.request_new'),
    'assets.requests',              jsonb_build_array('assets.approve_requests'),
    'assets.audits',                jsonb_build_array('assets.manage'),
    'assets.my_assets',             jsonb_build_array('assets.view_my_assets'),
    'performance.ratings_overview', jsonb_build_array('performance.view_own_ratings'),
    'performance.calibration',      jsonb_build_array('performance.calibration'),
    'performance.self_assessment',  jsonb_build_array('performance.self_assessment'),
    'performance.peer_assessment',  jsonb_build_array('performance.peer_assessment'),
    'performance.manager_assessment', jsonb_build_array('performance.manager_assessment'),
    'performance.assessment_ratings', jsonb_build_array('performance.view_own_ratings'),
    'performance.questionnaire',    jsonb_build_array('performance.calibration')
  );
BEGIN
  FOR v_client IN SELECT id, enabled_features FROM public.clients WHERE enabled_features IS NOT NULL LOOP
    v_new := ARRAY[]::TEXT[];
    FOREACH v_old IN ARRAY v_client.enabled_features LOOP
      IF v_map ? v_old THEN
        v_new := v_new || ARRAY(SELECT jsonb_array_elements_text(v_map -> v_old));
      ELSE
        v_new := v_new || ARRAY[v_old];
      END IF;
    END LOOP;
    UPDATE public.clients
    SET enabled_features = ARRAY(SELECT DISTINCT unnest(v_new))
    WHERE id = v_client.id;
  END LOOP;
END $$;