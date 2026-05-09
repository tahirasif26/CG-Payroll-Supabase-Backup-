export interface ModuleFeature {
  key: string;
  label: string;
  description?: string;
}

export interface ModuleCatalog {
  key: string;
  label: string;
  features: ModuleFeature[];
}

/**
 * IMPORTANT: Feature keys here MUST match `requiredFeature` values in
 * `src/lib/navigation.ts` and rows in the `feature_definitions` table.
 * Otherwise `hasFeature()` will silently return false and sidebar items
 * will not render.
 */
export const MODULE_CATALOG: ModuleCatalog[] = [
  {
    key: "employees",
    label: "Employees",
    features: [
      { key: "employees.view_directory", label: "Directory" },
      { key: "employees.view_org_chart", label: "Org Chart" },
      { key: "employees.view_birthdays", label: "Important Dates" },
      { key: "leave.view_balance", label: "Leave Management" },
      { key: "leave.apply", label: "Apply for Leave" },
      { key: "leave.approve", label: "Approve Leave" },
      { key: "employees.add", label: "Add Employees" },
      { key: "employees.edit", label: "Edit Employees" },
      { key: "employees.deactivate", label: "Deactivate Employee" },
      { key: "leave.view_team_calendar", label: "View Team Leave Calendar" },
      { key: "employees.view_id_cards", label: "Employee ID Cards" },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    features: [
      { key: "payroll.create_run", label: "Create Payroll Run" },
      { key: "payroll.view_all_runs", label: "View All Payroll Runs" },
      { key: "payroll.approve_run", label: "Approve Payroll Run" },
      { key: "payroll.view_own_payslip", label: "View Own Payslip" },
      { key: "payroll.download_payslip", label: "Download Payslip" },
      { key: "payroll.view_salary_breakdown", label: "View Salary Breakdown" },
      { key: "payroll.export_csv", label: "Export Payroll CSV" },
      { key: "loans.view_own", label: "View Own Loans" },
      { key: "loans.request", label: "Request Loan" },
      { key: "loans.approve", label: "Approve Loans" },
      { key: "loans.view_all", label: "View All Loans" },
    ],
  },
  {
    key: "expenses",
    label: "Expense Tracking",
    features: [
      { key: "expenses.view_own", label: "View Own Expenses" },
      { key: "expenses.submit", label: "Submit Expenses" },
      { key: "expenses.view_all", label: "View All Expenses" },
      { key: "expenses.approve", label: "Approve Expenses" },
      { key: "expenses.mileage_submit", label: "Submit Mileage" },
      { key: "advances.view_own", label: "View Own Advances" },
      { key: "advances.request", label: "Request Advance" },
      { key: "advances.approve", label: "Approve Advances" },
    ],
  },
  {
    key: "assets",
    label: "Asset Tracking",
    features: [
      { key: "assets.view_inventory", label: "Asset Inventory" },
      { key: "assets.manage", label: "Manage Assets" },
      { key: "assets.manage_store", label: "Manage Asset Store (Add Items)" },
      { key: "assets.request_new", label: "Request New Asset" },
      { key: "assets.approve_requests", label: "Approve Asset Requests" },
      { key: "assets.view_my_assets", label: "View My Assets" },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    features: [
      { key: "performance.self_assessment", label: "Self Assessment" },
      { key: "performance.peer_assessment", label: "Peer Assessment" },
      { key: "performance.manager_assessment", label: "Manager Assessment" },
      { key: "performance.calibration", label: "Rating Calibration" },
      { key: "performance.view_own_ratings", label: "View Own Ratings" },
    ],
  },
  {
    key: "policies",
    label: "Company Policies",
    features: [
      { key: "policies.view", label: "View Policies" },
    ],
  },
  {
    key: "timesheets",
    label: "Timesheets",
    features: [
      { key: "timesheets.submit", label: "Submit Timesheets" },
      { key: "timesheets.approve", label: "Approve Timesheets" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Exports",
    features: [
      { key: "reports.view", label: "View Reports", description: "Export payroll, leave, headcount" },
    ],
  },
  {
    key: "audit",
    label: "Audit & Compliance",
    features: [
      { key: "audit.view", label: "View Audit Trail", description: "See who changed what and when" },
    ],
  },
];

export function allFeaturesForModules(moduleKeys: string[]): string[] {
  return MODULE_CATALOG
    .filter((m) => moduleKeys.includes(m.key))
    .flatMap((m) => m.features.map((f) => f.key));
}

export function featuresForModule(moduleKey: string): ModuleFeature[] {
  return MODULE_CATALOG.find((m) => m.key === moduleKey)?.features || [];
}
