import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import type { Session, User } from "@supabase/supabase-js";

export type LegacyRole = "employer" | "employee";
export type RoleValue = AppRole | LegacyRole;

interface RoleContextType {
  /**
   * DEPRECATED legacy role string. For backward compatibility with the bulk of
   * the app that still checks `role === "employer"` / `"employee"`.
   * Migrate consumers to `appRole` / `isSuperAdmin` / `hasFeature` over time.
   */
  role: LegacyRole;

  // New (preferred) — use these in all new code:
  appRole: AppRole | null;
  isSuperAdmin: boolean;
  clientId: string | null;
  features: Set<string>;
  hasFeature: (key: string) => boolean;

  // Auth + profile
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;

  // Legacy convenience
  currentEmployeeId: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

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
        hasFeature: auth.hasFeature,
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

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
