import { createContext, useContext, ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
}

interface RoleContextType {
  role: AppRole;
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <RoleContext.Provider value={{
      role: auth.role,
      user: auth.user,
      profile: auth.profile,
      session: auth.session,
      loading: auth.loading,
      signOut: auth.signOut,
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
