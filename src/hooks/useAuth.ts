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
  loading: true,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const loadAuthData = async (session: Session) => {
      const userId = session.user.id;

      const [profileRes, roleRes, featuresRes, enabledModulesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.rpc("get_user_role", { _user_id: userId }),
        supabase.rpc("get_user_features", { _user_id: userId }),
        (supabase as any).rpc("get_user_enabled_modules", { _user_id: userId }),
      ]);

      const profile = (profileRes.data as Profile | null) ?? null;
      const role = (roleRes.data as AppRole | null) ?? null;
      const featureRows = (featuresRes.data as Array<{ feature_key: string; enabled: boolean }> | null) ?? [];
      const features = new Set(featureRows.filter((r) => r.enabled).map((r) => r.feature_key));

      const rawEnabledModules = (enabledModulesRes.data ?? null) as unknown as string[] | null;
      const enabledModules = rawEnabledModules && rawEnabledModules.length > 0 ? rawEnabledModules : null;

      setState({
        session,
        user: session.user,
        profile,
        role,
        clientId: profile?.client_id ?? null,
        isSuperAdmin: role === "super_admin",
        features,
        enabledModules,
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

  const hasFeature = (key: string): boolean => state.isSuperAdmin || state.features.has(key);

  return { ...state, hasFeature, signOut };
}
