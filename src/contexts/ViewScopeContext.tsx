import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";

export type ViewScope = "me" | "people";

interface ViewScopeContextType {
  scope: ViewScope;
  setScope: (s: ViewScope) => void;
  /** True if the user has at least one feature with people_enabled=true,
   *  or is an admin / super_admin (who always have people-level access). */
  hasPeopleAccess: boolean;
}

const ViewScopeContext = createContext<ViewScopeContextType | undefined>(undefined);

export function ViewScopeProvider({ children }: { children: ReactNode }) {
  const { peopleFeatures, appRole, isSuperAdmin } = useRole();
  const hasPeopleAccess =
    isSuperAdmin || appRole === "admin" ||
    (appRole === "hr" && (peopleFeatures?.size ?? 0) > 0);

  // Everyone defaults to "me" on login (personal dashboard).
  // Super admin keeps "people" since they have no personal ESS view.
  const [scope, setScope] = useState<ViewScope>(isSuperAdmin ? "people" : "me");

  // If user loses people access, reset to "me"
  useEffect(() => {
    if (!hasPeopleAccess && scope !== "me") setScope("me");
  }, [hasPeopleAccess, scope]);

  // When auth resolves, force super_admin to "people" and everyone else to "me" once.
  useEffect(() => {
    if (isSuperAdmin) setScope("people");
    else setScope("me");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, appRole]);

  return (
    <ViewScopeContext.Provider value={{ scope, setScope, hasPeopleAccess }}>
      {children}
    </ViewScopeContext.Provider>
  );
}

export function useViewScope() {
  const ctx = useContext(ViewScopeContext);
  if (!ctx) throw new Error("useViewScope must be used within ViewScopeProvider");
  return ctx;
}
