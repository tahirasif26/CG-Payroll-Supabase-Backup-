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
}

export interface NavSection {
  label: string;
  items: NavItem[];
  requiredRoles?: AppRole[];
}

export const navigationConfig: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Payroll Analytics", path: "/analytics", icon: TrendingUp, requiredRoles: ["admin"] },
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
    requiredRoles: ["admin", "employee"],
    items: [
      {
        label: "Employees", path: "/employees", icon: Users,
        requiredFeature: "employees.view_directory",
        labelsByRole: { employee: "Directory" },
      },
      { label: "Org Chart", path: "/org-chart", icon: Network, requiredFeature: "employees.view_org_chart" },
      { label: "Important Dates", path: "/birthdays", icon: Cake, requiredFeature: "employees.view_birthdays" },
      {
        label: "Leave Management", path: "/leave", icon: CalendarDays,
        requiredFeature: "leave.view_balance",
        labelsByRole: { employee: "My Leave" },
      },
    ],
  },

  {
    label: "Payroll & Finance",
    requiredRoles: ["admin", "employee"],
    items: [
      {
        label: "Payroll", path: "/payroll", icon: Wallet,
        requiredRoles: ["admin"],
        children: [
          { label: "Payroll Setup", path: "/payroll/setup", requiredRoles: ["admin"] },
          { label: "Payroll Runs", path: "/payroll", requiredRoles: ["admin"] },
          { label: "End of Service", path: "/separations", requiredRoles: ["admin"] },
        ],
      },
      {
        label: "Payslips", path: "/payslips", icon: FileText,
        requiredFeature: "payroll.view_own_payslip",
        labelsByRole: { employee: "My Payslips" },
      },
      { label: "Compensation", path: "/compensation", icon: DollarSign, requiredRoles: ["admin"] },
      { label: "Deductions", path: "/deductions", icon: Calculator, requiredRoles: ["admin"] },
      {
        label: "Loans & Advances", path: "/loans", icon: Banknote,
        children: [
          { label: "Loans", path: "/loans", requiredFeature: "loans.view_own" },
          { label: "Advances", path: "/advances", requiredFeature: "advances.view_own" },
          { label: "Outstanding Advances", path: "/outstanding-advances", requiredRoles: ["admin"] },
        ],
      },
    ],
  },

  {
    label: "Expenses",
    requiredRoles: ["admin", "employee"],
    items: [
      {
        label: "Expenses", path: "/expenses", icon: Receipt,
        requiredFeature: "expenses.view_own",
        labelsByRole: { employee: "My Expenses" },
      },
      { label: "Expense Analytics", path: "/expense-analytics", icon: PieChart, requiredRoles: ["admin"] },
      { label: "Cost Allocation", path: "/cost-allocation", icon: Briefcase, requiredRoles: ["admin"] },
    ],
  },

  {
    label: "Assets",
    requiredRoles: ["admin", "employee"],
    items: [
      { label: "Asset Dashboard", path: "/assets/dashboard", icon: PieChart, requiredRoles: ["admin"] },
      { label: "Inventory", path: "/assets/inventory", icon: Package, requiredFeature: "assets.view_inventory" },
      { label: "Asset Store", path: "/assets/store", icon: Store, requiredFeature: "assets.request_new" },
      { label: "Requests", path: "/assets/requests", icon: Inbox, requiredFeature: "assets.approve_requests" },
      { label: "Audits", path: "/assets/audits", icon: Package, requiredRoles: ["admin"] },
    ],
  },

  {
    label: "Performance",
    requiredRoles: ["admin", "employee"],
    items: [
      { label: "Ratings Overview", path: "/performance/ratings", icon: Star, requiredRoles: ["admin"] },
      { label: "Self Assessment", path: "/performance/self-assessment", icon: UserCheck, requiredFeature: "performance.self_assessment" },
      { label: "Peer Assessment", path: "/performance/peer-assessment", icon: Users, requiredFeature: "performance.peer_assessment" },
      { label: "Manager Assessment", path: "/performance/manager-assessment", icon: UserCheck, requiredFeature: "performance.manager_assessment" },
    ],
  },

  {
    label: "Work",
    requiredRoles: ["admin", "employee"],
    items: [
      { label: "Projects", path: "/projects", icon: Briefcase, requiredRoles: ["admin"] },
      {
        label: "Timesheets", path: "/timesheets", icon: Clock,
        requiredFeature: "timesheets.submit",
        labelsByRole: { employee: "My Timesheets" },
      },
      { label: "Company Policies", path: "/company-policies", icon: Scroll, requiredFeature: "policies.view" },
    ],
  },

  {
    label: "Settings",
    requiredRoles: ["admin"],
    items: [
      {
        label: "Settings", path: "/settings/company", icon: Settings,
        requiredRoles: ["admin"],
        children: [
          { label: "Company Profile", path: "/settings/company" },
          { label: "Company Structure", path: "/settings/company-structure" },
          { label: "Payroll Settings", path: "/settings/payroll" },
          { label: "Approval Matrix", path: "/settings/approval-matrix", requiredRoles: ["admin"] },
          { label: "Feature Access", path: "/settings/feature-access", requiredRoles: ["admin"] },
          { label: "Expense Categories", path: "/settings/expense-categories" },
          { label: "Leave Types", path: "/settings/leave-types" },
          { label: "Reminders", path: "/settings/reminders" },
        ],
      },
    ],
  },
];

function itemAllowed(item: NavItem, role: AppRole, hasFeature: (k: string) => boolean): boolean {
  if (item.hideForRoles?.includes(role)) return false;
  if (item.requiredRoles && !item.requiredRoles.includes(role)) return false;
  // super_admin bypasses feature checks (handled in hasFeature already, but guard here too)
  if (item.requiredFeature && role !== "super_admin" && !hasFeature(item.requiredFeature)) return false;
  return true;
}

function filterItems(items: NavItem[], role: AppRole, hasFeature: (k: string) => boolean): NavItem[] {
  return items
    .map((item) => {
      if (!itemAllowed(item, role, hasFeature)) return null;
      const children = item.children ? filterItems(item.children, role, hasFeature) : undefined;
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
): NavSection[] {
  return config
    .filter((section) => !section.requiredRoles || section.requiredRoles.includes(role))
    .map((section) => ({ ...section, items: filterItems(section.items, role, hasFeature) }))
    .filter((section) => section.items.length > 0);
}

export function resolveLabel(item: NavItem, role: AppRole): string {
  return item.labelsByRole?.[role] ?? item.label;
}
