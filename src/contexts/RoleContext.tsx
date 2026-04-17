import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import type { Session, User } from "@supabase/supabase-js";

export type LegacyRole = "employer" | "employee";

interface RoleContextType {
  // New (preferred)
  role: AppRole | null;
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

  // Backward-compat (DEPRECATED — will be removed in later steps)
  legacyRole: LegacyRole;
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
        role: auth.role,
        isSuperAdmin: auth.isSuperAdmin,
        clientId: auth.clientId,
        features: auth.features,
        hasFeature: auth.hasFeature,
        user: auth.user,
        profile: auth.profile,
        session: auth.session,
        loading: auth.loading,
        signOut: auth.signOut,
        legacyRole,
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
