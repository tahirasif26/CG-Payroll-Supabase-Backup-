/**
 * Tab access stub for the NestJS migration. The full `tab_definitions` master
 * list (which used to live in Postgres) is hard-coded here so the AddClient
 * wizard, Module Access settings, and any tab-aware UI continue to render the
 * correct choices. Mutations are no-ops until a backend tab-access module is
 * built — at that point swap each function for a real @/api call.
 */
const noopMut = {
  mutate: () => console.warn("[useTabAccess] writes not yet on NestJS"),
  mutateAsync: async () => undefined,
  isPending: false,
};

export interface TabDefinition {
  tab_key: string;
  module_key: string;
  label: string;
  path: string;
  scope: "both" | "people_only";
  default_for_admin: boolean;
  sort_order: number;
}

export interface AccessibleTabInfo {
  enabled: boolean;
  peopleEnabled?: boolean;
}

const TAB_DEFINITIONS: TabDefinition[] = [
  // Employees
  { module_key: "employees", tab_key: "employees.directory",  label: "Directory",          path: "/employees",          scope: "people_only", default_for_admin: true, sort_order: 1 },
  { module_key: "employees", tab_key: "employees.org_chart",  label: "Org Chart",          path: "/org-chart",          scope: "both",        default_for_admin: true, sort_order: 2 },
  { module_key: "employees", tab_key: "employees.imp_dates",  label: "Imp Dates",          path: "/birthdays",          scope: "people_only", default_for_admin: true, sort_order: 3 },
  { module_key: "employees", tab_key: "employees.leave_mgmt", label: "Leave Management",   path: "/leave",              scope: "people_only", default_for_admin: true, sort_order: 4 },
  { module_key: "employees", tab_key: "employees.id_cards",   label: "Employee Cards",     path: "/id-cards",           scope: "people_only", default_for_admin: true, sort_order: 5 },
  { module_key: "employees", tab_key: "employees.hr_settings",label: "HR Settings",        path: "/employees/settings", scope: "people_only", default_for_admin: true, sort_order: 6 },
  // Payroll
  { module_key: "payroll",   tab_key: "payroll.setup",        label: "Payroll Setup",      path: "/payroll/setup",      scope: "people_only", default_for_admin: true, sort_order: 1 },
  { module_key: "payroll",   tab_key: "payroll.runs",         label: "Payroll Runs",       path: "/payroll",            scope: "people_only", default_for_admin: true, sort_order: 2 },
  { module_key: "payroll",   tab_key: "payroll.payslips",     label: "Payslips",           path: "/payslips",           scope: "both",        default_for_admin: true, sort_order: 3 },
  { module_key: "payroll",   tab_key: "payroll.eos",          label: "End of Service",     path: "/separations",        scope: "people_only", default_for_admin: true, sort_order: 4 },
  { module_key: "payroll",   tab_key: "payroll.loans",        label: "Loans",              path: "/loans",              scope: "both",        default_for_admin: true, sort_order: 5 },
  { module_key: "payroll",   tab_key: "payroll.analytics",    label: "Analytics",          path: "/analytics",          scope: "people_only", default_for_admin: true, sort_order: 6 },
  { module_key: "payroll",   tab_key: "payroll.settings",     label: "Payroll Settings",   path: "/payroll/settings",   scope: "people_only", default_for_admin: true, sort_order: 7 },
  // Expenses
  { module_key: "expenses",  tab_key: "expenses.claims",      label: "Expenses",           path: "/expenses",             scope: "both",        default_for_admin: true, sort_order: 1 },
  { module_key: "expenses",  tab_key: "expenses.advances",    label: "Advances",           path: "/advances",             scope: "both",        default_for_admin: true, sort_order: 2 },
  { module_key: "expenses",  tab_key: "expenses.outstanding", label: "Outstanding Advances", path: "/outstanding-advances", scope: "people_only", default_for_admin: true, sort_order: 3 },
  { module_key: "expenses",  tab_key: "expenses.analytics",   label: "Expense Analytics",  path: "/expense-analytics",    scope: "people_only", default_for_admin: true, sort_order: 4 },
  { module_key: "expenses",  tab_key: "expenses.settings",    label: "Expense Settings",   path: "/expenses/settings",    scope: "people_only", default_for_admin: true, sort_order: 5 },
  // Assets
  { module_key: "assets",    tab_key: "assets.dashboard",     label: "Dashboard",          path: "/assets/dashboard",     scope: "people_only", default_for_admin: true, sort_order: 1 },
  { module_key: "assets",    tab_key: "assets.inventory",     label: "Asset Inventory",    path: "/assets/inventory",     scope: "both",        default_for_admin: true, sort_order: 2 },
  { module_key: "assets",    tab_key: "assets.store",         label: "Asset Store",        path: "/assets/store",         scope: "both",        default_for_admin: true, sort_order: 3 },
  { module_key: "assets",    tab_key: "assets.requests",      label: "Asset Requests",     path: "/assets/requests",      scope: "people_only", default_for_admin: true, sort_order: 4 },
  { module_key: "assets",    tab_key: "assets.audits",        label: "Asset Audits",       path: "/assets/audits",        scope: "people_only", default_for_admin: true, sort_order: 5 },
  { module_key: "assets",    tab_key: "assets.settings",      label: "Asset Settings",     path: "/assets/master-data",   scope: "people_only", default_for_admin: true, sort_order: 6 },
  // Performance
  { module_key: "performance", tab_key: "performance.ratings",             label: "Ratings Overview",      path: "/performance/ratings",            scope: "people_only", default_for_admin: true, sort_order: 1 },
  { module_key: "performance", tab_key: "performance.calibration",         label: "Rating Calibration",    path: "/performance/calibration",        scope: "people_only", default_for_admin: true, sort_order: 2 },
  { module_key: "performance", tab_key: "performance.self",                label: "Self Assessment",       path: "/performance/self-assessment",    scope: "both",        default_for_admin: true, sort_order: 3 },
  { module_key: "performance", tab_key: "performance.peer",                label: "Peer Assessment",       path: "/performance/peer-assessment",    scope: "both",        default_for_admin: true, sort_order: 4 },
  { module_key: "performance", tab_key: "performance.manager",             label: "Manager Assessment",    path: "/performance/manager-assessment", scope: "people_only", default_for_admin: true, sort_order: 5 },
  { module_key: "performance", tab_key: "performance.assessment_ratings",  label: "Assessment Ratings",    path: "/performance/assessment-ratings", scope: "people_only", default_for_admin: true, sort_order: 6 },
  { module_key: "performance", tab_key: "performance.questionnaire",       label: "Questionnaire Settings", path: "/performance/questionnaire",     scope: "people_only", default_for_admin: true, sort_order: 7 },
  // Projects
  { module_key: "projects",  tab_key: "projects.list",        label: "Projects",           path: "/projects",             scope: "people_only", default_for_admin: true, sort_order: 1 },
  // Reports
  { module_key: "reports",   tab_key: "reports.all",          label: "Reports",            path: "/reports",              scope: "people_only", default_for_admin: true, sort_order: 1 },
  // Settings
  { module_key: "settings",  tab_key: "settings.company_profile",  label: "Company Profile",    path: "/settings/company",          scope: "people_only", default_for_admin: true, sort_order: 1 },
  { module_key: "settings",  tab_key: "settings.user_permissions", label: "User Permissions",   path: "/settings/user-permissions", scope: "people_only", default_for_admin: true, sort_order: 2 },
  { module_key: "settings",  tab_key: "settings.approval_matrix",  label: "Approval Matrix",    path: "/settings/approval-matrix",  scope: "people_only", default_for_admin: true, sort_order: 3 },
  { module_key: "settings",  tab_key: "settings.policies",         label: "Policies",           path: "/settings/policies",         scope: "people_only", default_for_admin: true, sort_order: 4 },
  { module_key: "settings",  tab_key: "settings.audit_trail",      label: "Audit Trail",        path: "/settings/audit-trail",      scope: "people_only", default_for_admin: true, sort_order: 5 },
  { module_key: "settings",  tab_key: "settings.visual",           label: "Visual Preferences", path: "/settings/visual",           scope: "people_only", default_for_admin: true, sort_order: 6 },
];

export function useTabDefinitions() {
  return { data: TAB_DEFINITIONS, isLoading: false };
}

export function useAccessibleTabs() {
  // Returning null = "tab gating disabled" → consumers fall back to role + feature checks.
  return { data: null as Map<string, AccessibleTabInfo> | null, isLoading: false };
}

export function useClientTabAccess(_clientId: string | null) {
  return { data: [] as { tab_key: string; enabled: boolean }[], isLoading: false };
}
export function useUpdateClientTabAccess() { return noopMut; }
export function useSetClientTabAccess() { return noopMut; }
export function useRoleTabAccess(_roleId?: string) {
  return { data: [] as { tab_key: string; enabled: boolean }[], isLoading: false };
}
export function useUpdateRoleTabAccess() { return noopMut; }
export function useSetRoleTabAccess() { return noopMut; }
