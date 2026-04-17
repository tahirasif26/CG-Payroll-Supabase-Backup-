-- Seed feature_definitions table with all ConnectHR features
-- This is idempotent - safe to run multiple times

INSERT INTO public.feature_definitions (feature_key, module, name, description, default_enabled_for_roles) VALUES
  -- Module: payroll (7 features)
  ('payroll.view_own_payslip', 'payroll', 'View Own Payslip', 'Allows the user to see their own monthly payslip in the dashboard.', ARRAY['admin', 'hr', 'employee']),
  ('payroll.download_payslip', 'payroll', 'Download Payslip PDF', 'Allows downloading payslip as PDF document for records.', ARRAY['admin', 'hr', 'employee']),
  ('payroll.view_salary_breakdown', 'payroll', 'View Salary Breakdown', 'View detailed breakdown of salary components and deductions.', ARRAY['admin', 'hr', 'employee']),
  ('payroll.view_all_runs', 'payroll', 'View All Payroll Runs', 'Access to view all historical payroll runs for the organization.', ARRAY['admin', 'hr']),
  ('payroll.create_run', 'payroll', 'Create Payroll Run', 'Permission to generate new payroll runs for processing.', ARRAY['admin', 'hr']),
  ('payroll.approve_run', 'payroll', 'Approve Payroll Run', 'Final approval authority to lock and approve payroll runs.', ARRAY['admin']),
  ('payroll.export_csv', 'payroll', 'Export Payroll CSV', 'Export payroll data in CSV format for external analysis.', ARRAY['admin', 'hr']),

  -- Module: expenses (5 features)
  ('expenses.submit', 'expenses', 'Submit Expense', 'Submit expense claims for reimbursement.', ARRAY['admin', 'hr', 'employee']),
  ('expenses.view_own', 'expenses', 'View Own Expenses', 'View personal expense claim history and status.', ARRAY['admin', 'hr', 'employee']),
  ('expenses.view_all', 'expenses', 'View All Expenses', 'Access all employee expense claims for review.', ARRAY['admin', 'hr']),
  ('expenses.approve', 'expenses', 'Approve Expenses', 'Grants permission to approve or reject expense submissions from team members.', ARRAY['admin', 'hr']),
  ('expenses.mileage_submit', 'expenses', 'Submit Mileage Entry', 'Submit GPS-tracked or manual mileage reimbursement claims.', ARRAY['admin', 'hr', 'employee']),

  -- Module: leave (4 features)
  ('leave.view_balance', 'leave', 'View Own Leave Balance', 'Check current leave balance and upcoming expiry dates.', ARRAY['admin', 'hr', 'employee']),
  ('leave.apply', 'leave', 'Apply for Leave', 'Submit leave requests for annual, sick, or other leave types.', ARRAY['admin', 'hr', 'employee']),
  ('leave.view_team_calendar', 'leave', 'View Team Leave Calendar', 'View team-wide leave calendar for planning.', ARRAY['admin', 'hr']),
  ('leave.approve', 'leave', 'Approve Leave Requests', 'Review and approve or reject leave applications.', ARRAY['admin', 'hr']),

  -- Module: assets (5 features)
  ('assets.view_my_assets', 'assets', 'View My Assigned Assets', 'View list of IT and other assets assigned to the user.', ARRAY['admin', 'hr', 'employee']),
  ('assets.request_new', 'assets', 'Request New Asset', 'Submit requests for new equipment or asset allocation.', ARRAY['admin', 'hr', 'employee']),
  ('assets.view_inventory', 'assets', 'View Asset Inventory', 'Browse complete asset inventory and assignments.', ARRAY['admin', 'hr']),
  ('assets.manage', 'assets', 'Manage Assets', 'Add, edit, transfer, and retire assets in the system.', ARRAY['admin', 'hr']),
  ('assets.approve_requests', 'assets', 'Approve Asset Requests', 'Review and approve incoming asset allocation requests.', ARRAY['admin', 'hr']),

  -- Module: employees (6 features)
  ('employees.view_directory', 'employees', 'View Employee Directory', 'Access the employee directory with contact information.', ARRAY['admin', 'hr', 'employee']),
  ('employees.view_org_chart', 'employees', 'View Org Chart', 'View organizational hierarchy and reporting structure.', ARRAY['admin', 'hr', 'employee']),
  ('employees.view_birthdays', 'employees', 'View Birthdays', 'View upcoming birthdays and work anniversaries.', ARRAY['admin', 'hr', 'employee']),
  ('employees.add', 'employees', 'Add Employee', 'Create new employee records and send onboarding invites.', ARRAY['admin', 'hr']),
  ('employees.edit', 'employees', 'Edit Employee Details', 'Modify employee information, roles, and assignments.', ARRAY['admin', 'hr']),
  ('employees.deactivate', 'employees', 'Deactivate Employee', 'Deactivate or terminate employee accounts.', ARRAY['admin']),

  -- Module: profile (3 features)
  ('profile.edit_personal', 'profile', 'Edit Own Personal Info', 'Update personal details like phone, address, emergency contacts.', ARRAY['admin', 'hr', 'employee']),
  ('profile.upload_documents', 'profile', 'Upload Own Documents', 'Upload personal documents like ID, visa, certificates.', ARRAY['admin', 'hr', 'employee']),
  ('profile.view_id_card', 'profile', 'View Own ID Card', 'View and download company ID card.', ARRAY['admin', 'hr', 'employee']),

  -- Module: loans (4 features)
  ('loans.request', 'loans', 'Request a Loan', 'Submit loan applications for salary advances or personal loans.', ARRAY['admin', 'hr', 'employee']),
  ('loans.view_own', 'loans', 'View Own Loans', 'View personal loan status, EMI schedule, and balance.', ARRAY['admin', 'hr', 'employee']),
  ('loans.view_all', 'loans', 'View All Loans', 'Access all employee loan records for management.', ARRAY['admin', 'hr']),
  ('loans.approve', 'loans', 'Approve Loans', 'Review and approve loan applications and EMI adjustments.', ARRAY['admin']),

  -- Module: advances (3 features)
  ('advances.request', 'advances', 'Request Salary Advance', 'Submit requests for salary advances before payday.', ARRAY['admin', 'hr', 'employee']),
  ('advances.view_own', 'advances', 'View Own Advances', 'View personal advance requests and outstanding amounts.', ARRAY['admin', 'hr', 'employee']),
  ('advances.approve', 'advances', 'Approve Advances', 'Approve or reject salary advance requests from employees.', ARRAY['admin', 'hr']),

  -- Module: performance (5 features)
  ('performance.self_assessment', 'performance', 'Submit Self Assessment', 'Complete self-evaluation forms during review cycles.', ARRAY['admin', 'hr', 'employee']),
  ('performance.view_own_ratings', 'performance', 'View Own Ratings', 'View personal performance ratings and feedback history.', ARRAY['admin', 'hr', 'employee']),
  ('performance.peer_assessment', 'performance', 'Submit Peer Assessment', 'Provide feedback and ratings for colleagues.', ARRAY['admin', 'hr', 'employee']),
  ('performance.manager_assessment', 'performance', 'Submit Manager Assessment', 'Complete performance assessments for direct reports.', ARRAY['admin', 'hr']),
  ('performance.calibration', 'performance', 'Performance Calibration', 'Participate in rating calibration sessions for fairness.', ARRAY['admin']),

  -- Module: policies (2 features)
  ('policies.view', 'policies', 'View Company Policies', 'Access company policy documents and handbooks.', ARRAY['admin', 'hr', 'employee']),
  ('policies.acknowledge', 'policies', 'Acknowledge Policies', 'Acknowledge receipt and understanding of policy updates.', ARRAY['admin', 'hr', 'employee']),

  -- Module: timesheets (2 features)
  ('timesheets.submit', 'timesheets', 'Submit Timesheet', 'Log daily/weekly hours worked for projects.', ARRAY['admin', 'hr', 'employee']),
  ('timesheets.approve', 'timesheets', 'Approve Timesheets', 'Review and approve timesheet entries from team members.', ARRAY['admin', 'hr'])

ON CONFLICT (feature_key) DO NOTHING;