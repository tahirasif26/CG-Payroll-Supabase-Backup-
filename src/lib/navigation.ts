import {
  LayoutDashboard, TrendingUp, Users, Network, Cake, CalendarDays,
  Wallet, FileText, DollarSign, Calculator, Banknote,
  Receipt, PieChart, Briefcase,
  Package, Store, Inbox,
  Star, UserCheck,
  Clock, Scroll,
  Settings, Building2, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export interface NavItem {
  label: string;
  path: string;
  icon?: LucideIcon;
  children?: NavItem[];
  requiredFeature?: string;
  requiredRoles?: AppRole[];
  hideForRoles?: AppRole[];
  labelsByRole?: Partial<Record<AppRole, string>>;
  /** If set, item is hidden when client's enabled_modules doesn't include this key. */
  module?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
  requiredRoles?: AppRole[];
  /** If set, section is hidden when client's enabled_modules doesn't include this key. */
  module?: string;
}

export const navigationConfig: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Payroll Analytics", path: "/analytics", icon: TrendingUp, requiredRoles: ["admin", "hr"], module: "payroll" },
    ],
  },

  // Super-admin only
  {
    label: "Platform",
    requiredRoles: ["super_admin"],
    items: [
      { label: "Client Management", path: "/manage/clients", icon: Building2, requiredRoles: ["super_admin"] },
      { label: "Feature Access", path: "/settings/feature-access", icon: ShieldCheck, requiredRoles: ["super_admin"] },
      { label: "System Users", path: "/settings/users", icon: Users, requiredRoles: ["super_admin"] },
    ],
  },

  {
    label: "People",
    requiredRoles: ["admin", "hr", "employee"],
    items: [
      {
        label: "Employees", path: "/employees", icon: Users,
        requiredFeature: "employees.view_directory",
        labelsByRole: { employee: "Directory" },
        module: "employees",
      },
      { label: "Org Chart", path: "/org-chart", icon: Network, requiredFeature: "employees.view_org_chart", module: "employees" },
      { label: "Important Dates", path: "/birthdays", icon: Cake, requiredFeature: "employees.view_birthdays", module: "employees" },
      {
        label: "Leave Management", path: "/leave", icon: CalendarDays,
        requiredFeature: "leave.view_balance",
        labelsByRole: { employee: "My Leave" },
        module: "leave",
      },
    ],
  },

  {
    label: "Payroll & Finance",
    requiredRoles: ["admin", "hr", "employee"],
    items: [
      {
        label: "Payroll", path: "/payroll", icon: Wallet,
        requiredRoles: ["admin", "hr"],
        module: "payroll",
        children: [
          { label: "Payroll Setup", path: "/payroll/setup", requiredRoles: ["admin", "hr"], module: "payroll" },
          { label: "Payroll Runs", path: "/payroll", requiredRoles: ["admin", "hr"], module: "payroll" },
          { label: "End of Service", path: "/separations", requiredRoles: ["admin", "hr"], module: "payroll" },
        ],
      },
      {
        label: "Payslips", path: "/payslips", icon: FileText,
        requiredFeature: "payroll.view_own_payslip",
        labelsByRole: { employee: "My Payslips" },
        module: "payroll",
      },
      { label: "Compensation", path: "/compensation", icon: DollarSign, requiredRoles: ["admin", "hr"], module: "payroll" },
      { label: "Deductions", path: "/deductions", icon: Calculator, requiredRoles: ["admin", "hr"], module: "payroll" },
      {
        label: "Loans & Advances", path: "/loans", icon: Banknote,
        children: [
          { label: "Loans", path: "/loans", requiredFeature: "loans.view_own", module: "loans" },
          { label: "Advances", path: "/advances", requiredFeature: "advances.view_own", module: "advances" },
          { label: "Outstanding Advances", path: "/outstanding-advances", requiredRoles: ["admin", "hr"], module: "advances" },
        ],
      },
    ],
  },

  {
    label: "Expenses",
    requiredRoles: ["admin", "hr", "employee"],
    module: "expenses",
    items: [
      {
        label: "Expenses", path: "/expenses", icon: Receipt,
        requiredFeature: "expenses.view_own",
        labelsByRole: { employee: "My Expenses" },
        module: "expenses",
      },
      { label: "Expense Analytics", path: "/expense-analytics", icon: PieChart, requiredRoles: ["admin", "hr"], module: "expenses" },
      { label: "Cost Allocation", path: "/cost-allocation", icon: Briefcase, requiredRoles: ["admin", "hr"], module: "expenses" },
    ],
  },

  {
    label: "Assets",
    requiredRoles: ["admin", "hr", "employee"],
    module: "assets",
    items: [
      { label: "Asset Dashboard", path: "/assets/dashboard", icon: PieChart, requiredRoles: ["admin", "hr"], module: "assets" },
      { label: "Inventory", path: "/assets/inventory", icon: Package, requiredFeature: "assets.view_inventory", module: "assets" },
      { label: "Asset Store", path: "/assets/store", icon: Store, requiredFeature: "assets.request_new", module: "assets" },
      { label: "Requests", path: "/assets/requests", icon: Inbox, requiredFeature: "assets.approve_requests", module: "assets" },
      { label: "Audits", path: "/assets/audits", icon: Package, requiredRoles: ["admin", "hr"], module: "assets" },
    ],
  },

  {
    label: "Performance",
    requiredRoles: ["admin", "hr", "employee"],
    module: "performance",
    items: [
      { label: "Ratings Overview", path: "/performance/ratings", icon: Star, requiredRoles: ["admin", "hr"], module: "performance" },
      { label: "Self Assessment", path: "/performance/self-assessment", icon: UserCheck, requiredFeature: "performance.self_assessment", module: "performance" },
      { label: "Peer Assessment", path: "/performance/peer-assessment", icon: Users, requiredFeature: "performance.peer_assessment", module: "performance" },
      { label: "Manager Assessment", path: "/performance/manager-assessment", icon: UserCheck, requiredFeature: "performance.manager_assessment", module: "performance" },
    ],
  },

  {
    label: "Work",
    requiredRoles: ["admin", "hr", "employee"],
    items: [
      { label: "Projects", path: "/projects", icon: Briefcase, requiredRoles: ["admin", "hr"], module: "projects" },
      {
        label: "Timesheets", path: "/timesheets", icon: Clock,
        requiredFeature: "timesheets.submit",
        labelsByRole: { employee: "My Timesheets" },
        module: "timesheets",
      },
      { label: "Company Policies", path: "/company-policies", icon: Scroll, requiredFeature: "policies.view", module: "policies" },
    ],
  },

  {
    label: "Settings",
    requiredRoles: ["admin", "hr"],
    items: [
      {
        label: "Settings", path: "/settings/company", icon: Settings,
        requiredRoles: ["admin", "hr"],
        children: [
          { label: "Company Profile", path: "/settings/company" },
          { label: "Company Structure", path: "/settings/company-structure" },
          { label: "Payroll Settings", path: "/settings/payroll", module: "payroll" },
          { label: "Approval Matrix", path: "/settings/approval-matrix", requiredRoles: ["admin"] },
          { label: "Feature Access", path: "/settings/feature-access", requiredRoles: ["admin", "hr"] },
          { label: "Expense Categories", path: "/settings/expense-categories", module: "expenses" },
          { label: "Leave Types", path: "/settings/leave-types", module: "leave" },
          { label: "Reminders", path: "/settings/reminders" },
        ],
      },
    ],
  },
];

function moduleAllowed(itemModule: string | undefined, role: AppRole, enabledModules: string[] | null): boolean {
  if (role === "super_admin") return true;
  if (!itemModule) return true;
  if (enabledModules === null) return true; // null = no restriction
  return enabledModules.includes(itemModule);
}

function itemAllowed(
  item: NavItem,
  role: AppRole,
  hasFeature: (k: string) => boolean,
  enabledModules: string[] | null,
): boolean {
  if (item.hideForRoles?.includes(role)) return false;
  if (item.requiredRoles && !item.requiredRoles.includes(role)) return false;
  if (!moduleAllowed(item.module, role, enabledModules)) return false;
  // super_admin bypasses feature checks (handled in hasFeature already, but guard here too)
  if (item.requiredFeature && role !== "super_admin" && !hasFeature(item.requiredFeature)) return false;
  return true;
}

function filterItems(
  items: NavItem[],
  role: AppRole,
  hasFeature: (k: string) => boolean,
  enabledModules: string[] | null,
): NavItem[] {
  return items
    .map((item) => {
      if (!itemAllowed(item, role, hasFeature, enabledModules)) return null;
      const children = item.children ? filterItems(item.children, role, hasFeature, enabledModules) : undefined;
      // If item originally had children but all are filtered out, drop it
      if (item.children && item.children.length > 0 && (!children || children.length === 0)) {
        return null;
      }
      return { ...item, children };
    })
    .filter((x: NavItem | null): x is NavItem => x !== null);
}

export function filterNavigationForUser(
  config: NavSection[],
  role: AppRole,
  hasFeature: (k: string) => boolean,
  enabledModules: string[] | null = null,
): NavSection[] {
  return config
    .filter((section) => !section.requiredRoles || section.requiredRoles.includes(role))
    .filter((section) => moduleAllowed(section.module, role, enabledModules))
    .map((section) => ({ ...section, items: filterItems(section.items, role, hasFeature, enabledModules) }))
    .filter((section) => section.items.length > 0);
}

export function resolveLabel(item: NavItem, role: AppRole): string {
  return item.labelsByRole?.[role] ?? item.label;
}
