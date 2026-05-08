import { ReactNode } from "react";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { RoleContext, useRole } from "./role-context-internal";
import type { LegacyRole, RoleValue } from "./role-context-internal";

export { useRole };
export type { LegacyRole, RoleValue };

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const legacyRole: LegacyRole =
    auth.role === "admin" || auth.role === "hr" || auth.role === "super_admin"
      ? "employer"
      : "employee";

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
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}
