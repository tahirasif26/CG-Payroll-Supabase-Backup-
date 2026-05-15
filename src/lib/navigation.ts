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
  /** Tab key from public.tab_definitions used for tab-wise permission gating. */
  tabKey?: string;
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
  /** Tab key for basePath-only groups (no children) — used for tab-wise gating. */
  tabKey?: string;
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
        tabKey: "employees.directory",
      },
      { label: "Org Chart", path: "/org-chart", requiredFeature: "employees.view_org_chart", tabKey: "employees.org_chart" },
      { label: "Imp Dates", path: "/birthdays", requiredFeature: "employees.view_birthdays", tabKey: "employees.imp_dates" },
      {
        label: "Leave Management",
        path: "/leave",
        requiredFeature: "leave.view_balance",
        labelsByRole: { employee: "My Leave" },
        tabKey: "employees.leave_mgmt",
      },
      {
        label: "Employee Cards",
        path: "/id-cards",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "employees.view_id_cards",
        tabKey: "employees.id_cards",
      },
      {
        label: "HR Settings",
        path: "/employees/settings",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "employees.edit",
        tabKey: "employees.hr_settings",
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
        tabKey: "payroll.setup",
      },
      {
        label: "Payroll Runs",
        path: "/payroll",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "payroll.view_all_runs",
        tabKey: "payroll.runs",
      },
      {
        label: "Payslips",
        path: "/payslips",
        requiredFeature: "payroll.view_own_payslip",
        labelsByRole: { employee: "My Payslips" },
        tabKey: "payroll.payslips",
      },
      {
        label: "End of Service",
        path: "/separations",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "payroll.view_all_runs",
        tabKey: "payroll.eos",
      },
      { label: "Loans", path: "/loans", requiredFeature: "loans.view_own", tabKey: "payroll.loans" },
      { label: "Analytics", path: "/analytics", requiredRoles: ["admin", "hr"], requiredFeature: "payroll.export_csv", tabKey: "payroll.analytics" },
      {
        label: "Payroll Settings",
        path: "/payroll/settings",
        requiredRoles: ["admin", "hr"],
        tabKey: "payroll.settings",
      },
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
        tabKey: "expenses.claims",
      },
      { label: "Advances", path: "/advances", requiredFeature: "advances.view_own", tabKey: "expenses.advances" },
      {
        label: "Outstanding Advances",
        path: "/outstanding-advances",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "advances.approve",
        tabKey: "expenses.outstanding",
      },
      {
        label: "Expense Analytics",
        path: "/expense-analytics",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "expenses.view_all",
        tabKey: "expenses.analytics",
      },
      {
        label: "Expense Settings",
        path: "/expenses/settings",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "expenses.approve",
        tabKey: "expenses.settings",
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
        tabKey: "assets.dashboard",
      },
      { label: "Asset Inventory", path: "/assets/inventory", requiredFeature: "assets.view_inventory", tabKey: "assets.inventory" },
      { label: "Asset Store", path: "/assets/store", requiredFeature: "assets.request_new", tabKey: "assets.store" },
      { label: "Asset Requests", path: "/assets/requests", requiredFeature: "assets.approve_requests", tabKey: "assets.requests" },
      {
        label: "Asset Audits",
        path: "/assets/audits",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "assets.manage",
        tabKey: "assets.audits",
      },
      {
        label: "Asset Settings",
        path: "/assets/master-data",
        requiredRoles: ["admin", "hr"],
        requiredFeature: "assets.manage",
        tabKey: "assets.settings",
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
      { label: "Ratings Overview", path: "/performance/ratings", requiredRoles: ["admin", "hr"], tabKey: "performance.ratings" },
      { label: "Rating Calibration", path: "/performance/calibration", requiredRoles: ["admin"], tabKey: "performance.calibration" },
      {
        label: "Self Assessment",
        path: "/performance/self-assessment",
        requiredFeature: "performance.self_assessment",
        tabKey: "performance.self",
      },
      {
        label: "Peer Assessment",
        path: "/performance/peer-assessment",
        requiredFeature: "performance.peer_assessment",
        tabKey: "performance.peer",
      },
      { label: "Manager Assessment", path: "/performance/manager-assessment", requiredRoles: ["admin", "hr"], tabKey: "performance.manager" },
      { label: "Assessment Ratings", path: "/performance/assessment-ratings", requiredRoles: ["admin", "hr"], tabKey: "performance.assessment_ratings" },
      { label: "Questionnaire Settings", path: "/performance/questionnaire", requiredRoles: ["admin"], tabKey: "performance.questionnaire" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    icon: FolderOpen,
    basePath: "/projects",
    requiredRoles: ["admin", "hr"],
    tabKey: "projects.list",
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    basePath: "/reports",
    requiredRoles: ["admin", "hr"],
    tabKey: "reports.all",
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
      { label: "Company Profile", path: "/settings/company", tabKey: "settings.company_profile" },
      { label: "User Permissions", path: "/settings/user-permissions", requiredRoles: ["admin"], tabKey: "settings.user_permissions" },
      { label: "Approval Matrix", path: "/settings/approval-matrix", requiredRoles: ["admin"], tabKey: "settings.approval_matrix" },
      { label: "Policies", path: "/settings/company-policies", requiredRoles: ["admin", "hr"], tabKey: "settings.policies" },
      { label: "Audit Trail", path: "/audit-trail", requiredRoles: ["admin", "hr"], tabKey: "settings.audit_trail" },
      { label: "Visual Preferences", path: "/settings/visual", tabKey: "settings.visual" },
    ],
  },
];

export const superAdminGroups: NavGroup[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, basePath: "/" },
  { key: "clients", label: "Client Management", icon: Building2, basePath: "/manage/clients" },
  { key: "module-access", label: "Module Access", icon: ToggleLeft, basePath: "/manage/module-access" },
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

export interface AccessibleTabInfo {
  scope: "both" | "people_only";
  people_enabled: boolean;
}

/** True if a tab should appear in the given UI scope ("me" or "people"). */
function isTabAccessible(
  tabKey: string | undefined,
  uiScope: "me" | "people",
  accessibleTabs: Map<string, AccessibleTabInfo> | null,
): boolean {
  // No tabKey on this nav item — fall through to other gating.
  if (!tabKey) return true;
  // Tab access not yet loaded — be permissive (other gating still applies).
  if (!accessibleTabs) return true;
  const info = accessibleTabs.get(tabKey);
  if (!info) return false;
  if (uiScope === "people") return info.people_enabled;
  // Me scope — only personal-scope tabs are visible there.
  return info.scope === "both";
}

export function filterNavigation(
  groups: NavGroup[],
  role: AppRole,
  hasFeature: (key: string) => boolean,
  enabledModules: string[] | null,
  roleFeatures?: Set<string>,
  accessibleTabs?: Map<string, AccessibleTabInfo> | null,
): NavGroup[] {
  return groups
    .filter((g) => {
      if (g.requiredRoles && !g.requiredRoles.includes(role)) return false;
      if (!moduleAllowedByEnabled(g.key, role, enabledModules)) return false;
      // Group-level tab gating (basePath-only groups like Projects, Reports)
      if (g.tabKey && role !== "super_admin" && !isTabAccessible(g.tabKey, "people", accessibleTabs ?? null)) {
        return false;
      }
      // Legacy feature gate only applies when no tabKey present
      if (!g.tabKey && g.requiredFeature && role !== "super_admin" && !hasFeature(g.requiredFeature)) return false;
      // Custom (hr) role: only show modules where role has at least one feature
      // Skip this check when tab access is the source of truth (any tab in this module enabled)
      if (role === "hr" && g.moduleFeatureKey && roleFeatures && roleFeatures.size > 0) {
        const prefix = g.moduleFeatureKey + ".";
        const hasModuleFeature = [...roleFeatures].some((fk) => fk.startsWith(prefix));
        const hasModuleTab = accessibleTabs
          ? [...accessibleTabs.entries()].some(
              ([key, t]) => key.startsWith(prefix) && t.people_enabled,
            )
          : false;
        if (!hasModuleFeature && !hasModuleTab) return false;
      }
      return true;
    })
    .map((g) => {
      if (!g.children) return g;
      const filteredChildren = g.children.filter((c) => {
        if (c.hideForRoles?.includes(role)) return false;
        if (c.requiredRoles && !c.requiredRoles.includes(role)) return false;
        // Tab-wise permissions are AUTHORITATIVE when tabKey is present.
        // Skip ALL legacy feature checks for tab-gated children.
        if (c.tabKey) {
          if (role !== "super_admin" && !isTabAccessible(c.tabKey, "people", accessibleTabs ?? null)) {
            return false;
          }
          return true;
        }
        // Legacy gating for children without tabKey
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
      if (g.children) return g.children.length > 0;
      return true;
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
      { label: "Org Chart", path: "/org-chart", requiredFeature: "employees.view_org_chart", tabKey: "employees.org_chart" },
    ],
  },
  {
    key: "my-payroll",
    label: "My Payroll",
    icon: DollarSign,
    children: [
      { label: "My Payslips", path: "/payslips", requiredFeature: "payroll.view_own_payslip", tabKey: "payroll.payslips" },
      { label: "My Loans", path: "/loans", requiredFeature: "loans.view_own", tabKey: "payroll.loans" },
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
      { label: "My Claims", path: "/expenses", requiredFeature: "expenses.view_own", tabKey: "expenses.claims" },
      { label: "My Advances", path: "/advances", requiredFeature: "advances.view_own", tabKey: "expenses.advances" },
    ],
  },
  {
    key: "my-assets",
    label: "My Assets",
    icon: Package,
    children: [
      { label: "Assigned to Me", path: "/assets/mine", requiredFeature: "assets.view_my_assets", tabKey: "assets.inventory" },
      { label: "Request Asset", path: "/assets/store", requiredFeature: "assets.request_new", tabKey: "assets.store" },
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
        tabKey: "performance.self",
      },
      {
        label: "Peer Assessment",
        path: "/performance/peer-assessment",
        requiredFeature: "performance.peer_assessment",
        tabKey: "performance.peer",
      },
      { label: "My Ratings", path: "/performance/assessment-ratings", requiredFeature: "performance.view_own_ratings" },
    ],
  },
  {
    key: "policies",
    label: "Policies",
    icon: FileText,
    children: [{ label: "Company Policies", path: "/company-policies" }],
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

/** Filter Me navigation by enabled modules + per-feature gating + tab access. */
export function filterMeNavigation(
  hasFeature: (key: string) => boolean,
  enabledModules: string[] | null,
  accessibleTabs?: Map<string, AccessibleTabInfo> | null,
): NavGroup[] {
  return meNavigationGroups
    .filter((g) => {
      const moduleKey = ME_MODULE_MAP[g.key];
      if (!moduleKey) return true;
      if (enabledModules === null) return true;
      return enabledModules.includes(moduleKey);
    })
    .map((g) => {
      if (!g.children) return g;
      const children = g.children.filter((c) => {
        // Tab-wise is authoritative when tabKey is present
        if (c.tabKey) {
          return isTabAccessible(c.tabKey, "me", accessibleTabs ?? null);
        }
        if (c.requiredFeature && !hasFeature(c.requiredFeature)) return false;
        return true;
      });
      return { ...g, children };
    })
    .filter((g) => {
      if (g.basePath) return true;
      return !!g.children && g.children.length > 0;
    });
}
