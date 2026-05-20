/**
 * Tab access for the NestJS backend. The `tab_definitions` master list is
 * hard-coded below (one source of truth for both the wizard and the FE
 * navigation). Per-client enabled tab keys are persisted on the Client row
 * via `/tenants/:id/tab-access`, and the current user's accessible set comes
 * from `/tenants/me/tabs`.
 */
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMyTabs,
  useTenantTabAccess,
  useSetTenantTabAccess,
  tabAccessKeys,
} from "@/api";
import type { AccessibleTabInfo as NavTabInfo } from "@/lib/navigation";

const noopMut = {
  mutate: () => console.warn("[useTabAccess] role-level writes not implemented"),
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

/** Re-export so callers can keep importing from this module. */
export type AccessibleTabInfo = NavTabInfo;

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

/**
 * Returns a Map keyed by tab_key for tabs the caller can access, or `null`
 * for super_admin (unrestricted). When the API returns an empty array the
 * caller is locked to zero tabs — we still return a (empty) Map so consumers
 * filter everything out instead of bypassing the gate.
 */
export function useAccessibleTabs() {
  const q = useMyTabs();
  const map = useMemo<Map<string, AccessibleTabInfo> | null>(() => {
    if (q.isLoading) return null; // pre-load: don't restrict (avoids flash)
    const keys = q.data?.enabledTabKeys;
    if (keys === null || keys === undefined) return null; // super_admin
    const defByKey = new Map(TAB_DEFINITIONS.map((d) => [d.tab_key, d]));
    const m = new Map<string, AccessibleTabInfo>();
    for (const k of keys) {
      const def = defByKey.get(k);
      m.set(k, {
        scope: def?.scope ?? "people_only",
        people_enabled: true,
      });
    }
    return m;
  }, [q.data, q.isLoading]);
  return { data: map, isLoading: q.isLoading };
}

/** Super-admin: read a client's enabled tab keys (for the wizard edit/view). */
export function useClientTabAccess(clientId: string | null) {
  const q = useTenantTabAccess(clientId);
  const data = useMemo(
    () =>
      (q.data?.enabledTabKeys ?? []).map((tab_key) => ({
        tab_key,
        enabled: true,
      })),
    [q.data],
  );
  return { data, isLoading: q.isLoading };
}

/** Super-admin: replace a client's tab access set. */
export function useSetClientTabAccess() {
  const m = useSetTenantTabAccess();
  const qc = useQueryClient();
  return {
    ...m,
    mutate: ({ clientId, tabKeys }: { clientId: string; tabKeys: string[] }) =>
      m.mutate(
        { id: clientId, enabledTabKeys: tabKeys },
        { onSuccess: () => qc.invalidateQueries({ queryKey: tabAccessKeys.mine }) },
      ),
    mutateAsync: async ({ clientId, tabKeys }: { clientId: string; tabKeys: string[] }) => {
      const res = await m.mutateAsync({ id: clientId, enabledTabKeys: tabKeys });
      qc.invalidateQueries({ queryKey: tabAccessKeys.mine });
      return res;
    },
  };
}

/** Kept as alias for legacy callers. */
export const useUpdateClientTabAccess = useSetClientTabAccess;

/** Role-level tab access not yet implemented on NestJS — stubs only. */
export function useRoleTabAccess(_roleId?: string) {
  return { data: [] as { tab_key: string; enabled: boolean }[], isLoading: false };
}
export function useUpdateRoleTabAccess() { return noopMut; }
export function useSetRoleTabAccess() { return noopMut; }
