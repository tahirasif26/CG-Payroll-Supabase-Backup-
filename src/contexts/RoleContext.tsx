import { ReactNode, useMemo } from "react";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { RoleContext, useRole } from "./role-context-internal";
import type { LegacyRole, RoleValue } from "./role-context-internal";
import { useAccessibleTabs, useTabDefinitions } from "@/hooks/queries/useTabs";

export { useRole };
export type { LegacyRole, RoleValue };

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const legacyRole: LegacyRole =
    auth.role === "admin" || auth.role === "hr" || auth.role === "super_admin"
      ? "employer"
      : "employee";

  const { data: tabKeys = [], isLoading: tabsLoading } = useAccessibleTabs(auth.user?.id ?? null);
  const { data: tabDefs = [] } = useTabDefinitions();

  const accessibleTabKeys = useMemo(() => new Set(tabKeys), [tabKeys]);
  const accessibleTabPaths = useMemo(() => {
    const set = new Set<string>();
    for (const t of tabDefs) {
      if (accessibleTabKeys.has(t.tab_key)) set.add(t.path.split("?")[0]);
    }
    return set;
  }, [tabDefs, accessibleTabKeys]);

  const hasTab = (key: string) => accessibleTabKeys.has(key);
  const hasTabPath = (path: string) => {
    if (auth.isSuperAdmin) return true;
    // If tabs not loaded yet OR client has no tab rows, don't block — fall back to feature gating.
    if (accessibleTabPaths.size === 0) return true;
    return accessibleTabPaths.has(path.split("?")[0]);
  };

  return (
    <RoleContext.Provider
      value={{
        role: legacyRole,
        appRole: auth.role,
        isSuperAdmin: auth.isSuperAdmin,
        clientId: auth.clientId,
        features: auth.features,
        enabledModules: auth.enabledModules,
        enabledFeatures: auth.enabledFeatures,
        employeeFeatures: auth.employeeFeatures,
        roleFeatures: auth.roleFeatures,
        peopleFeatures: auth.peopleFeatures,
        isOrphan: auth.isOrphan,
        customRoleName: auth.customRoleName,
        hasFeature: auth.hasFeature,
        hasPeopleFeature: auth.hasPeopleFeature,
        user: auth.user,
        profile: auth.profile,
        session: auth.session,
        loading: auth.loading,
        signOut: auth.signOut,
        currentEmployeeId: auth.profile?.employee_id || "1",
        accessibleTabKeys,
        accessibleTabPaths,
        hasTab,
        hasTabPath,
        tabsLoading,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
