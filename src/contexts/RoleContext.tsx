import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import type { Session, User } from "@supabase/supabase-js";

type LegacyRole = AppRole | "employer" | "employee";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
}

interface RoleContextType {
  role: LegacyRole;
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  currentEmployeeId: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // Map admin/hr to "employer" for backward compatibility with existing pages
  const legacyRole: LegacyRole = (auth.role === "admin" || auth.role === "hr") ? "employer" : "employee";

  return (
    <RoleContext.Provider value={{
      role: legacyRole,
      user: auth.user,
      profile: auth.profile,
      session: auth.session,
      loading: auth.loading,
      signOut: auth.signOut,
      currentEmployeeId: auth.profile?.employee_id || "1",
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
