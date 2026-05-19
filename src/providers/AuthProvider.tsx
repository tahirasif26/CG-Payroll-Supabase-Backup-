import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  onAuthEvent,
  tokenStorage,
  useMe,
  useMyEffectiveFeatures,
  userKeys,
  type CurrentUser,
} from "@/api";

// ─── Public types — kept compatible with the old `useAuth` shape ────────────

export type AppRole = "super_admin" | "admin" | "hr" | "employee";

/**
 * Profile shape preserved from the old Supabase contract so the 20+ consumers
 * of `useRole()/useAuth()` don't have to change. Snake-case field names match
 * what the existing UI reads.
 */
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  client_id: string | null;
  phone: string | null;
  is_active: boolean;
}

/** Minimal Supabase-Session-compatible shape consumed by existing UI. */
export interface SessionLike {
  user: UserLike;
  accessToken: string;
}

/** Minimal Supabase-User-compatible shape. */
export interface UserLike {
  id: string;
  email: string;
}

export interface AuthState {
  session: SessionLike | null;
  user: UserLike | null;
  profile: Profile | null;
  role: AppRole | null;
  clientId: string | null;
  isSuperAdmin: boolean;
  features: Set<string>;
  enabledModules: string[] | null;
  enabledFeatures: string[] | null;
  employeeFeatures: string[] | null;
  roleFeatures: Set<string>;
  peopleFeatures: Set<string>;
  isOrphan: boolean;
  customRoleName: string | null;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  hasFeature: (key: string) => boolean;
  hasPeopleFeature: (key: string) => boolean;
  signOut: () => Promise<void>;
}

const initialState: AuthState = {
  session: null,
  user: null,
  profile: null,
  role: null,
  clientId: null,
  isSuperAdmin: false,
  features: new Set<string>(),
  enabledModules: null,
  enabledFeatures: null,
  employeeFeatures: null,
  roleFeatures: new Set<string>(),
  peopleFeatures: new Set<string>(),
  isOrphan: false,
  customRoleName: null,
  loading: true,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // tokenStorage is mutable — subscribe so we re-render when login/logout/refresh
  // mutates the access token from elsewhere.
  const [hasToken, setHasToken] = useState<boolean>(() => !!tokenStorage.getAccessToken());
  useEffect(() => {
    return tokenStorage.subscribe(() => {
      setHasToken(!!tokenStorage.getAccessToken());
    });
  }, []);

  // Forced-logout signal from the axios interceptor (refresh failed, etc.).
  useEffect(() => {
    return onAuthEvent((event) => {
      if (event === "unauthenticated") {
        qc.removeQueries({ queryKey: userKeys.all });
        // Token is already cleared by the interceptor; setHasToken updates via subscribe.
      }
    });
  }, [qc]);

  const meQuery = useMe();
  const featuresQuery = useMyEffectiveFeatures();

  const me: CurrentUser | undefined = meQuery.data;

  // Derive the role from the user's primary client membership. If there's no
  // primary client (super_admin only) take whatever super_admin binding exists.
  const { role, clientId, customRoleName, isSuperAdmin } = useMemo(() => {
    if (!me) {
      return { role: null as AppRole | null, clientId: null as string | null, customRoleName: null as string | null, isSuperAdmin: false };
    }
    const superBinding = me.userRoles.find((r) => r.role.appRole === "super_admin");
    if (superBinding) {
      return {
        role: "super_admin" as AppRole,
        clientId: me.primaryClientId,
        customRoleName: null,
        isSuperAdmin: true,
      };
    }
    // Prefer the binding for primaryClientId; fall back to first.
    const binding =
      me.userRoles.find((r) => r.clientId && r.clientId === me.primaryClientId) ??
      me.userRoles[0] ??
      null;
    if (!binding) {
      return { role: null as AppRole | null, clientId: me.primaryClientId, customRoleName: null, isSuperAdmin: false };
    }
    return {
      role: binding.role.appRole as AppRole,
      clientId: binding.clientId,
      customRoleName: binding.role.name && !["Admin", "Employee"].includes(binding.role.name) ? binding.role.name : null,
      isSuperAdmin: false,
    };
  }, [me]);

  const features = useMemo(() => new Set(featuresQuery.data?.keys ?? []), [featuresQuery.data]);

  const profile: Profile | null = me
    ? {
        id: me.id,
        full_name: me.profile?.fullName ?? null,
        avatar_url: me.profile?.avatarUrl ?? null,
        employee_id: me.employee?.empId ?? null,
        client_id: me.primaryClientId,
        phone: me.profile?.phone ?? null,
        is_active: me.status === "active",
      }
    : null;

  const user: UserLike | null = me ? { id: me.id, email: me.email } : null;
  const session: SessionLike | null =
    hasToken && me
      ? { user: { id: me.id, email: me.email }, accessToken: tokenStorage.getAccessToken() ?? "" }
      : null;

  const isOrphan = !!role && role !== "super_admin" && !me?.employee && !!clientId;

  const loading = hasToken && (meQuery.isLoading || featuresQuery.isLoading);

  const hasFeature = useCallback(
    (key: string): boolean => {
      if (isSuperAdmin) return true;
      return features.has(key);
    },
    [features, isSuperAdmin],
  );

  /**
   * People-scope check. Phase 2.1 stub: super-admin and admin always pass;
   * hr/employee never do. The full role-features matrix lands when the
   * backend roles/features endpoints port in Phase 3.
   */
  const hasPeopleFeature = useCallback(
    (_key: string): boolean => {
      if (isSuperAdmin) return true;
      if (role === "admin") return true;
      return false;
    },
    [isSuperAdmin, role],
  );

  const signOut = useCallback(async () => {
    await authApi.logout();
    qc.clear();
  }, [qc]);

  const value: AuthContextValue = {
    ...initialState,
    session,
    user,
    profile,
    role,
    clientId,
    isSuperAdmin,
    features,
    customRoleName,
    isOrphan,
    loading,
    hasFeature,
    hasPeopleFeature,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
