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

  // Admin/HR default to "people" (company view); employees default to "me"
  const defaultScope: ViewScope =
    appRole === "admin" || appRole === "hr" || isSuperAdmin ? "people" : "me";

  const [scope, setScope] = useState<ViewScope>(defaultScope);

  // If user loses people access, reset to "me"
  useEffect(() => {
    if (!hasPeopleAccess && scope !== "me") setScope("me");
  }, [hasPeopleAccess, scope]);

  // When appRole loads (after async auth), set correct default
  useEffect(() => {
    if (appRole === "admin" || appRole === "hr" || isSuperAdmin) {
      setScope("people");
    } else if (appRole === "employee") {
      setScope("me");
    }
  }, [appRole, isSuperAdmin]);

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
