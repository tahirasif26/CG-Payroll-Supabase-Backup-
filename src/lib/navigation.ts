import {
  LayoutDashboard, TrendingUp, Users, Cake, CalendarDays,
  Wallet, Receipt, Package, Star, Clock, Scroll, Settings,
  Building2, ShieldCheck, Banknote, Network, ToggleLeft,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export interface NavTab {
  label: string;
  path: string;
  requiredFeature?: string;
  requiredRoles?: AppRole[];
  hideForRoles?: AppRole[];
  labelsByRole?: Partial<Record<AppRole, string>>;
}

export interface NavModule {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  tabs?: NavTab[];
  requiredFeature?: string;
  requiredRoles?: AppRole[];
  hideForRoles?: AppRole[];
  labelsByRole?: Partial<Record<AppRole, string>>;
}

/** Module keys exempt from `enabled_modules` checks (always shown if role allows). */
const EXEMPT_MODULE_KEYS = new Set(["dashboard", "settings", "analytics", "platform-clients", "platform-features", "platform-users"]);

export const navigationModules: NavModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    basePath: "/",
  },
  {
    key: "analytics",
    label: "Payroll Analytics",
    icon: TrendingUp,
    basePath: "/analytics",
    requiredRoles: ["admin", "hr"],
  },
  {
    key: "employees",
    label: "Employees",
    icon: Users,
    basePath: "/employees",
    labelsByRole: { employee: "Directory" },
    tabs: [
      { label: "Directory", path: "/employees", requiredFeature: "employees.view_directory" },
      { label: "Org Chart", path: "/org-chart", requiredFeature: "employees.view_org_chart" },
      { label: "Important Dates", path: "/birthdays", requiredFeature: "employees.view_birthdays" },
    ],
  },
  {
    key: "leave",
    label: "Leave",
    icon: CalendarDays,
    basePath: "/leave",
    requiredFeature: "leave.view_balance",
    labelsByRole: { employee: "My Leave" },
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: Wallet,
    basePath: "/payroll",
    requiredRoles: ["admin", "hr", "employee"],
    tabs: [
      { label: "Payroll Runs", path: "/payroll", requiredRoles: ["admin", "hr"] },
      { label: "Payslips", path: "/payslips", requiredFeature: "payroll.view_own_payslip", labelsByRole: { employee: "My Payslips" } },
      { label: "Compensation", path: "/compensation", requiredRoles: ["admin", "hr"] },
      { label: "Deductions", path: "/deductions", requiredRoles: ["admin", "hr"] },
      { label: "End of Service", path: "/separations", requiredRoles: ["admin", "hr"] },
      { label: "Payroll Setup", path: "/payroll/setup", requiredRoles: ["admin", "hr"] },
    ],
  },
  {
    key: "loans",
    label: "Loans & Advances",
    icon: Banknote,
    basePath: "/loans",
    tabs: [
      { label: "Loans", path: "/loans", requiredFeature: "loans.view_own" },
      { label: "Advances", path: "/advances", requiredFeature: "advances.view_own" },
      { label: "Outstanding Advances", path: "/outstanding-advances", requiredRoles: ["admin", "hr"] },
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: Receipt,
    basePath: "/expenses",
    labelsByRole: { employee: "My Expenses" },
    tabs: [
      { label: "Expenses", path: "/expenses", requiredFeature: "expenses.view_own" },
      { label: "Analytics", path: "/expense-analytics", requiredRoles: ["admin", "hr"] },
      { label: "Cost Allocation", path: "/cost-allocation", requiredRoles: ["admin", "hr"] },
    ],
  },
  {
    key: "assets",
    label: "Assets",
    icon: Package,
    basePath: "/assets",
    tabs: [
      { label: "Dashboard", path: "/assets/dashboard", requiredRoles: ["admin", "hr"] },
      { label: "Inventory", path: "/assets/inventory", requiredFeature: "assets.view_inventory" },
      { label: "Asset Store", path: "/assets/store", requiredFeature: "assets.request_new" },
      { label: "Requests", path: "/assets/requests", requiredFeature: "assets.approve_requests" },
      { label: "Audits", path: "/assets/audits", requiredRoles: ["admin", "hr"] },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    icon: Star,
    basePath: "/performance",
    tabs: [
      { label: "Ratings", path: "/performance/ratings", requiredRoles: ["admin", "hr"] },
      { label: "Self Assessment", path: "/performance/self-assessment", requiredFeature: "performance.self_assessment" },
      { label: "Peer Assessment", path: "/performance/peer-assessment", requiredFeature: "performance.peer_assessment" },
      { label: "Manager Assessment", path: "/performance/manager-assessment", requiredFeature: "performance.manager_assessment" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    icon: Network,
    basePath: "/projects",
    requiredRoles: ["admin", "hr"],
  },
  {
    key: "timesheets",
    label: "Timesheets",
    icon: Clock,
    basePath: "/timesheets",
    requiredFeature: "timesheets.submit",
    labelsByRole: { employee: "My Timesheets" },
  },
  {
    key: "policies",
    label: "Company Policies",
    icon: Scroll,
    basePath: "/company-policies",
    requiredFeature: "policies.view",
  },
  {
    key: "birthdays",
    label: "Important Dates",
    icon: Cake,
    basePath: "/birthdays",
    hideForRoles: ["admin", "hr"], // available via Employees tabs for staff
    requiredFeature: "employees.view_birthdays",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/settings",
    requiredRoles: ["admin", "hr"],
    tabs: [
      { label: "Company Profile", path: "/settings/company" },
      { label: "Company Structure", path: "/settings/company-structure" },
      { label: "Payroll Settings", path: "/settings/payroll" },
      { label: "Approval Matrix", path: "/settings/approval-matrix", requiredRoles: ["admin"] },
      { label: "Feature Access", path: "/settings/feature-access", requiredRoles: ["admin", "hr"] },
      { label: "Expense Categories", path: "/settings/expense-categories" },
      { label: "Leave Types", path: "/settings/leave-types" },
      { label: "Reminders", path: "/settings/reminders" },
    ],
  },
];

export const superAdminModules: NavModule[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, basePath: "/" },
  { key: "platform-clients", label: "Client Management", icon: Building2, basePath: "/manage/clients" },
  { key: "platform-features", label: "Feature Access", icon: ShieldCheck, basePath: "/settings/feature-access" },
  { key: "platform-users", label: "System Users", icon: Users, basePath: "/settings/users" },
];

function moduleAllowedByEnabled(key: string, role: AppRole, enabledModules: string[] | null): boolean {
  if (role === "super_admin") return true;
  if (EXEMPT_MODULE_KEYS.has(key)) return true;
  if (enabledModules === null) return true;
  return enabledModules.includes(key);
}

export function filterModulesForUser(
  modules: NavModule[],
  role: AppRole,
  hasFeature: (key: string) => boolean,
  enabledModules: string[] | null,
): NavModule[] {
  return modules.filter((m) => {
    if (m.hideForRoles?.includes(role)) return false;
    if (m.requiredRoles && !m.requiredRoles.includes(role)) return false;
    if (!moduleAllowedByEnabled(m.key, role, enabledModules)) return false;
    if (m.requiredFeature && role !== "super_admin" && !hasFeature(m.requiredFeature)) return false;
    return true;
  });
}

export function filterTabsForUser(
  tabs: NavTab[] | undefined,
  role: AppRole,
  hasFeature: (key: string) => boolean,
): NavTab[] {
  if (!tabs) return [];
  return tabs.filter((t) => {
    if (t.hideForRoles?.includes(role)) return false;
    if (t.requiredRoles && !t.requiredRoles.includes(role)) return false;
    if (t.requiredFeature && role !== "super_admin" && !hasFeature(t.requiredFeature)) return false;
    return true;
  });
}

export function resolveModuleLabel(m: NavModule, role: AppRole): string {
  return m.labelsByRole?.[role] ?? m.label;
}

export function resolveTabLabel(t: NavTab, role: AppRole): string {
  return t.labelsByRole?.[role] ?? t.label;
}
