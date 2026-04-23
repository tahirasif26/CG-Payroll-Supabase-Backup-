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

export const MODULE_CATALOG: ModuleCatalog[] = [
  {
    key: "employees",
    label: "Employees",
    features: [
      { key: "employees.directory", label: "Directory" },
      { key: "employees.org_chart", label: "Org Chart" },
      { key: "employees.important_dates", label: "Important Dates" },
      { key: "employees.leave", label: "Leave Management" },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    features: [
      { key: "payroll.setup", label: "Payroll Setup" },
      { key: "payroll.runs", label: "Payroll Runs" },
      { key: "payroll.payslips", label: "Payslips" },
      { key: "payroll.end_of_service", label: "End of Service" },
      { key: "payroll.loans", label: "Loans" },
      { key: "payroll.analytics", label: "Payroll Analytics" },
    ],
  },
  {
    key: "expenses",
    label: "Expense Tracking",
    features: [
      { key: "expenses.list", label: "Expenses" },
      { key: "expenses.advances", label: "Advances" },
      { key: "expenses.outstanding", label: "Outstanding Advances" },
      { key: "expenses.analytics", label: "Expense Analytics" },
    ],
  },
  {
    key: "assets",
    label: "Asset Tracking",
    features: [
      { key: "assets.dashboard", label: "Asset Dashboard" },
      { key: "assets.inventory", label: "Asset Inventory" },
      { key: "assets.settings", label: "Asset Settings" },
      { key: "assets.store", label: "Asset Store" },
      { key: "assets.requests", label: "Asset Requests" },
      { key: "assets.audits", label: "Asset Audits" },
      { key: "assets.my_assets", label: "My Assets (employee view)" },
    ],
  },
  {
    key: "access",
    label: "Access Management",
    features: [
      { key: "access.id_cards", label: "ID Cards" },
      { key: "access.door_lock", label: "Door & Lock Management" },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    features: [
      { key: "performance.ratings_overview", label: "Ratings Overview" },
      { key: "performance.calibration", label: "Rating Calibration" },
      { key: "performance.self_assessment", label: "Self Assessment" },
      { key: "performance.peer_assessment", label: "Peer Assessment" },
      { key: "performance.manager_assessment", label: "Manager Assessment" },
      { key: "performance.assessment_ratings", label: "Assessment Ratings" },
      { key: "performance.questionnaire", label: "Questionnaire Settings" },
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
