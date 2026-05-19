import { createContext, useContext } from "react";
import type {
  AppRole,
  Profile,
  SessionLike,
  UserLike,
} from "@/hooks/useAuth";

export type LegacyRole = "employer" | "employee";
export type RoleValue = AppRole | LegacyRole;

export interface RoleContextType {
  role: LegacyRole;
  appRole: AppRole | null;
  isSuperAdmin: boolean;
  clientId: string | null;
  features: Set<string>;
  enabledModules: string[] | null;
  enabledFeatures: string[] | null;
  employeeFeatures: string[] | null;
  roleFeatures: Set<string>;
  peopleFeatures: Set<string>;
  isOrphan: boolean;
  customRoleName: string | null;
  hasFeature: (key: string) => boolean;
  hasPeopleFeature: (key: string) => boolean;
  user: UserLike | null;
  profile: Profile | null;
  session: SessionLike | null;
  loading: boolean;
  signOut: () => Promise<void>;
  currentEmployeeId: string;
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
