import {
  LayoutDashboard,
  Users,
  DollarSign,
  Receipt,
  Package,
  Shield,
  Star,
  FolderOpen,
  Clock,
  Settings,
  Building2,
  ToggleLeft,
  UserCog,
  CalendarDays,
  UserCircle,
  FileText,
  BarChart3,
  History,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export interface NavChild {
  label: string;
  path: string;
  requiredFeature?: string;
  requiredRoles?: AppRole[];
  hideForRoles?: AppRole[];
  labelsByRole?: Partial<Record<AppRole, string>>;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath?: string;
  children?: NavChild[];
  requiredRoles?: AppRole[];
  requiredFeature?: string;
  labelsByRole?: Partial<Record<AppRole, string>>;
  /** Module key — if set, custom (hr) role must have at least one feature with this prefix */
  moduleFeatureKey?: string;
}

/** Group keys exempt from `enabled_modules` enforcement (always visible if role allows). */
const ALWAYS_VISIBLE_GROUPS = new Set(["dashboard", "settings", "upcoming"]);

export const navigationGroups: NavGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    basePath: "/",
  },
  {
    key: "employees",
    label: "Employees",
    icon: Users,
    moduleFeatureKey: "employees",
    children: [
      {
        label: "Directory",
        path: "/employees",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "employees.view_directory",
      },
      { label: "Org Chart", path: "/org-chart", requiredFeature: "employees.view_org_chart" },
      { label: "Imp Dates", path: "/birthdays", requiredFeature: "employees.view_birthdays" },
      {
        label: "Leave Management",
        path: "/leave",
        requiredFeature: "leave.view_balance",
        labelsByRole: { employee: "My Leave" },
      },
      {
        label: "Employee Cards",
        path: "/id-cards",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "employees.view_id_cards",
      },
      {
        label: "⚙ HR Settings",
        path: "/employees/settings",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "employees.edit",
      },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: DollarSign,
    moduleFeatureKey: "payroll",
    children: [
      {
        label: "Payroll Setup",
        path: "/payroll/setup",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "payroll.create_run",
      },
      {
        label: "Payroll Runs",
        path: "/payroll",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "payroll.view_all_runs",
      },
      {
        label: "Payslips",
        path: "/payslips",
        requiredFeature: "payroll.view_own_payslip",
        labelsByRole: { employee: "My Payslips" },
      },
      {
        label: "End of Service",
        path: "/separations",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "payroll.view_all_runs",
      },
      { label: "Loans", path: "/loans", requiredFeature: "loans.view_own" },
      { label: "Analytics", path: "/analytics", requiredRoles: ["admin", "hr"], requiredFeature: "payroll.export_csv" },
    ],
  },
  {
    key: "expenses",
    label: "Expense Tracking",
    icon: Receipt,
    moduleFeatureKey: "expenses",
    children: [
      {
        label: "Expenses",
        path: "/expenses",
        requiredFeature: "expenses.view_own",
        labelsByRole: { employee: "My Expenses" },
      },
      { label: "Advances", path: "/advances", requiredFeature: "advances.view_own" },
      {
        label: "Outstanding Advances",
        path: "/outstanding-advances",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "advances.approve",
      },
      {
        label: "Expense Analytics",
        path: "/expense-analytics",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "expenses.view_all",
      },
      {
        label: "⚙ Expense Settings",
        path: "/expenses/settings",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "expenses.approve",
      },
    ],
  },
  {
    key: "assets",
    label: "Asset Tracking",
    icon: Package,
    moduleFeatureKey: "assets",
    children: [
      {
        label: "Dashboard",
        path: "/assets/dashboard",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "assets.view_inventory",
      },
      { label: "Asset Inventory", path: "/assets/inventory", requiredFeature: "assets.view_inventory" },
      {
        label: "Asset Settings",
        path: "/assets/master-data",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "assets.manage",
      },
      { label: "Asset Store", path: "/assets/store", requiredFeature: "assets.request_new" },
      { label: "Asset Requests", path: "/assets/requests", requiredFeature: "assets.approve_requests" },
      {
        label: "Asset Audits",
        path: "/assets/audits",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "assets.manage",
      },
    ],
  },
  {
    key: "access",
    label: "Access Management",
    icon: Shield,
    requiredRoles: ["admin", "hr"],
    children: [
      { label: "ID Cards", path: "/id-cards" },
      { label: "Door & Lock Mgmt", path: "/access-management", requiredRoles: ["admin"] },
    ],
  },
  {
    key: "performance",
    label: "Performance",
    icon: Star,
    moduleFeatureKey: "performance",
    children: [
      { label: "Ratings Overview", path: "/performance/ratings", requiredRoles: ["admin", "hr"] },
      { label: "Rating Calibration", path: "/performance/calibration", requiredRoles: ["admin"] },
      {
        label: "Self Assessment",
        path: "/performance/self-assessment",
        requiredFeature: "performance.self_assessment",
      },
      {
        label: "Peer Assessment",
        path: "/performance/peer-assessment",
        requiredFeature: "performance.peer_assessment",
      },
      { label: "Manager Assessment", path: "/performance/manager-assessment", requiredRoles: ["admin", "hr"] },
      { label: "Assessment Ratings", path: "/performance/assessment-ratings", requiredRoles: ["admin", "hr"] },
      { label: "Questionnaire Settings", path: "/performance/questionnaire", requiredRoles: ["admin"] },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    icon: FolderOpen,
    basePath: "/projects",
    requiredRoles: ["admin", "hr"],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    basePath: "/reports",
    requiredRoles: ["admin", "hr"],
    requiredFeature: "reports.view",
  },
  {
    key: "upcoming",
    label: "Upcoming Features",
    icon: Clock,
    basePath: "/upcoming-features",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    requiredRoles: ["admin", "hr"],
    children: [
      { label: "Company Profile", path: "/settings/company", requiredFeature: "settings.company_profile" },
      { label: "User Permissions", path: "/settings/user-permissions", requiredRoles: ["admin"] },
      { label: "Module Access", path: "/settings/module-access", requiredRoles: ["admin"] },
      { label: "Approval Matrix", path: "/settings/approval-matrix", requiredRoles: ["admin"] },
      { label: "Policies", path: "/settings/company-policies", requiredRoles: ["admin", "hr"] },
      { label: "Audit Trail", path: "/audit-trail", requiredRoles: ["admin", "hr"], requiredFeature: "audit.view" },
      { label: "Visual Preferences", path: "/settings/visual", requiredFeature: "settings.visual_preferences" },
    ],
  },
];

export const superAdminGroups: NavGroup[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, basePath: "/" },
  { key: "clients", label: "Client Management", icon: Building2, basePath: "/manage/clients" },
  { key: "features", label: "Feature Definitions", icon: ToggleLeft, basePath: "/manage/features" },
  { key: "sysusers", label: "System Users", icon: Shield, basePath: "/manage/users" },
  { key: "account", label: "My Account", icon: UserCog, basePath: "/account" },
];

function moduleAllowedByEnabled(key: string, role: AppRole, enabledModules: string[] | null): boolean {
  if (role === "super_admin") return true;
  if (ALWAYS_VISIBLE_GROUPS.has(key)) return true;
  if (enabledModules === null) return true;
  return enabledModules.includes(key);
}

export function filterNavigation(
  groups: NavGroup[],
  role: AppRole,
  hasFeature: (key: string) => boolean,
  enabledModules: string[] | null,
  roleFeatures?: Set<string>,
): NavGroup[] {
  return groups
    .filter((g) => {
      if (g.requiredRoles && !g.requiredRoles.includes(role)) return false;
      if (g.requiredFeature && role !== "super_admin" && !hasFeature(g.requiredFeature)) return false;
      if (!moduleAllowedByEnabled(g.key, role, enabledModules)) return false;
      // Custom (hr) role: only show modules where role has at least one feature
      if (role === "hr" && g.moduleFeatureKey && roleFeatures && roleFeatures.size > 0) {
        const prefix = g.moduleFeatureKey + ".";
        const hasModuleFeature = [...roleFeatures].some((fk) => fk.startsWith(prefix));
        if (!hasModuleFeature) return false;
      }
      return true;
    })
    .map((g) => {
      if (!g.children) return g;
      const filteredChildren = g.children.filter((c) => {
        if (c.hideForRoles?.includes(role)) return false;
        if (c.requiredRoles && !c.requiredRoles.includes(role)) return false;
        if (
          role === "hr" &&
          roleFeatures &&
          roleFeatures.size > 0 &&
          c.requiredFeature &&
          !roleFeatures.has(c.requiredFeature)
        )
          return false;
        if (c.requiredFeature && role !== "super_admin" && !hasFeature(c.requiredFeature)) return false;
        return true;
      });
      return { ...g, children: filteredChildren };
    })
    .filter((g) => {
      if (g.basePath) return true;
      return !!g.children && g.children.length > 0;
    });
}

export function resolveGroupLabel(g: NavGroup, role: AppRole): string {
  return g.labelsByRole?.[role] ?? g.label;
}

export function resolveChildLabel(c: NavChild, role: AppRole): string {
  return c.labelsByRole?.[role] ?? c.label;
}

// ─────────────────────────────────────────────────────────────────
// "Me" navigation — personal pages shown when scope === "me"
// ─────────────────────────────────────────────────────────────────

export const meNavigationGroups: NavGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    basePath: "/",
  },
  {
    key: "my-profile",
    label: "My Profile",
    icon: UserCircle,
    children: [
      { label: "My Profile", path: "/profile" },
      { label: "My ID Card", path: "/id-cards" },
      { label: "Org Chart", path: "/org-chart", requiredFeature: "employees.view_org_chart" },
    ],
  },
  {
    key: "my-payroll",
    label: "My Payroll",
    icon: DollarSign,
    children: [
      { label: "My Payslips", path: "/payslips", requiredFeature: "payroll.view_own_payslip" },
      { label: "My Loans", path: "/loans", requiredFeature: "loans.view_own" },
    ],
  },
  {
    key: "my-leave",
    label: "My Leave",
    icon: CalendarDays,
    children: [
      { label: "Leave Requests", path: "/leave", requiredFeature: "leave.view_balance" },
      { label: "Leave Balances", path: "/leave?view=balances", requiredFeature: "leave.view_balance" },
    ],
  },
  {
    key: "my-expenses",
    label: "My Expenses",
    icon: Receipt,
    children: [
      { label: "My Claims", path: "/expenses", requiredFeature: "expenses.view_own" },
      { label: "My Advances", path: "/advances", requiredFeature: "advances.view_own" },
    ],
  },
  {
    key: "my-assets",
    label: "My Assets",
    icon: Package,
    children: [
      { label: "Assigned to Me", path: "/assets/mine", requiredFeature: "assets.view_my_assets" },
      { label: "Request Asset", path: "/assets/store", requiredFeature: "assets.request_new" },
    ],
  },
  {
    key: "my-performance",
    label: "My Performance",
    icon: Star,
    children: [
      {
        label: "Self Assessment",
        path: "/performance/self-assessment",
        requiredFeature: "performance.self_assessment",
      },
      {
        label: "Peer Assessment",
        path: "/performance/peer-assessment",
        requiredFeature: "performance.peer_assessment",
      },
      { label: "My Ratings", path: "/performance/assessment-ratings", requiredFeature: "performance.view_own_ratings" },
    ],
  },
  {
    key: "policies",
    label: "Policies",
    icon: FileText,
    children: [{ label: "Company Policies", path: "/company-policies", requiredFeature: "policies.view" }],
  },
];

/** Map "Me" group keys → top-level enabled_modules keys for tenant gating. */
const ME_MODULE_MAP: Record<string, string> = {
  people: "employees",
  "my-payroll": "payroll",
  "my-leave": "employees",
  "my-expenses": "expenses",
  "my-assets": "assets",
  "my-performance": "performance",
};

/** Filter Me navigation by enabled modules + per-feature gating.
 *  `dashboard`, `my-profile`, `policies` are always visible if the user has the role. */
export function filterMeNavigation(hasFeature: (key: string) => boolean, enabledModules: string[] | null): NavGroup[] {
  return meNavigationGroups
    .filter((g) => {
      const moduleKey = ME_MODULE_MAP[g.key];
      if (!moduleKey) return true;
      if (enabledModules === null) return true;
      return enabledModules.includes(moduleKey);
    })
    .map((g) => {
      if (!g.children) return g;
      const children = g.children.filter((c) => !c.requiredFeature || hasFeature(c.requiredFeature));
      return { ...g, children };
    })
    .filter((g) => {
      if (g.basePath) return true;
      return !!g.children && g.children.length > 0;
    });
}
