import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "hr" | "employee";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  client_id: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  clientId: string | null;
  isSuperAdmin: boolean;
  features: Set<string>;
  enabledModules: string[] | null;
  enabledFeatures: string[] | null;
  /** Per-employee feature whitelist. Only applies when role === "employee". */
  employeeFeatures: string[] | null;
  loading: boolean;
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
  loading: true,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const loadAuthData = async (session: Session) => {
      const userId = session.user.id;

      const [profileRes, roleRes, featuresRes, enabledModulesRes, enabledFeaturesRes, employeeRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.rpc("get_user_role", { _user_id: userId }),
        supabase.rpc("get_user_features", { _user_id: userId }),
        (supabase as any).rpc("get_user_enabled_modules", { _user_id: userId }),
        (supabase as any).rpc("get_user_enabled_features", { _user_id: userId }),
        (supabase as any)
          .from("employees")
          .select("id, enabled_features")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const profile = (profileRes.data as Profile | null) ?? null;
      const role = (roleRes.data as AppRole | null) ?? null;
      const featureRows = (featuresRes.data as Array<{ feature_key: string; enabled: boolean }> | null) ?? [];
      const features = new Set(featureRows.filter((r) => r.enabled).map((r) => r.feature_key));

      const rawEnabledModules = (enabledModulesRes.data ?? null) as unknown as string[] | null;
      const enabledModules = rawEnabledModules && rawEnabledModules.length > 0 ? rawEnabledModules : null;

      const rawEnabledFeatures = (enabledFeaturesRes.data ?? null) as unknown as string[] | null;
      const enabledFeatures = rawEnabledFeatures && rawEnabledFeatures.length > 0 ? rawEnabledFeatures : null;

      const rawEmployeeFeatures = (employeeRes.data as { enabled_features: string[] | null } | null)?.enabled_features ?? null;
      const employeeFeatures = Array.isArray(rawEmployeeFeatures) && rawEmployeeFeatures.length > 0 ? rawEmployeeFeatures : null;

      setState({
        session,
        user: session.user,
        profile,
        role,
        clientId: profile?.client_id ?? null,
        isSuperAdmin: role === "super_admin",
        features,
        enabledModules,
        enabledFeatures,
        employeeFeatures,
        loading: false,
      });

      // Update last_login_at (fire and forget)
      supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId)
        .then(() => {});
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadAuthData(session), 0);
      } else {
        setState({ ...initialState, loading: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    // Refresh features when the tab regains focus, so admin-side toggle changes
    // take effect quickly for the affected employee.
    const onFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadAuthData(session);
      });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasFeature = (key: string): boolean => {
    if (state.isSuperAdmin) return true;
    // Client-level gate (set by super admin when creating client)
    if (state.enabledFeatures !== null && !state.enabledFeatures.includes(key)) return false;
    // Per-employee gate (set by admin); admins/HR are not filtered further
    if (state.role === "employee" && state.employeeFeatures !== null && !state.employeeFeatures.includes(key)) {
      return false;
    }
    return state.features.has(key);
  };

  return { ...state, hasFeature, signOut };
}
