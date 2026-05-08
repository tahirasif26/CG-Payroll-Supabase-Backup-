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
  /** Features granted via assigned role (role_features table). */
  roleFeatures: Set<string>;
  /** Features for which the assigned role has people-level (others' data) access. */
  peopleFeatures: Set<string>;
  /** True when user has a role (admin/hr/employee) but NO employees row in this client. */
  isOrphan: boolean;
  /** Display name of the user's custom role (e.g. "HR", "Finance Manager"). Null for system roles. */
  customRoleName: string | null;
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
  roleFeatures: new Set<string>(),
  peopleFeatures: new Set<string>(),
  isOrphan: false,
  customRoleName: null,
  loading: true,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let lastLoadAt = 0;
    const loadAuthData = async (session: Session) => {
      const userId = session.user.id;

      const [profileRes, roleRes, clientIdRes, featuresRes, enabledModulesRes, enabledFeaturesRes, roleFeaturesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.rpc("get_user_role", { _user_id: userId }),
        supabase.rpc("get_user_client_id", { _user_id: userId }),
        supabase.rpc("get_user_features", { _user_id: userId }),
        (supabase as any).rpc("get_user_enabled_modules", { _user_id: userId }),
        (supabase as any).rpc("get_user_enabled_features", { _user_id: userId }),
        (supabase as any).rpc("get_role_features", { _user_id: userId }),
      ]);

      const profile = (profileRes.data as Profile | null) ?? null;
      const role = (roleRes.data as AppRole | null) ?? null;
      const resolvedClientId = (clientIdRes.data as string | null) ?? profile?.client_id ?? null;
      const featureRows = (featuresRes.data as Array<{ feature_key: string; enabled: boolean }> | null) ?? [];
      const baseFeatures = new Set(featureRows.filter((r) => r.enabled).map((r) => r.feature_key));

      const roleFeatureRows = ((roleFeaturesRes as any)?.data ?? []) as Array<{
        feature_key: string;
        people_enabled: boolean;
      }>;
      const roleFeatures = new Set(roleFeatureRows.map((r) => r.feature_key));
      const peopleFeatures = new Set(roleFeatureRows.filter((r) => r.people_enabled).map((r) => r.feature_key));

      // Merge: role features UNION employee-level overrides (employee feature_toggles)
      const features = new Set<string>([...baseFeatures, ...roleFeatures]);

      const rawEnabledModules = (enabledModulesRes.data ?? null) as unknown as string[] | null;
      const enabledModules = rawEnabledModules && rawEnabledModules.length > 0 ? rawEnabledModules : null;

      const rawEnabledFeatures = (enabledFeaturesRes.data ?? null) as unknown as string[] | null;
      const enabledFeatures = rawEnabledFeatures && rawEnabledFeatures.length > 0 ? rawEnabledFeatures : null;

      type EmployeeAccessRow = { id: string; user_id: string | null; enabled_features: string[] | null };

      const fetchEmployeeAccess = async (column: "user_id" | "emp_id" | "email", value: string) => {
        let query = (supabase as any)
          .from("employees")
          .select("id, user_id, enabled_features")
          .eq(column, value);

        if (resolvedClientId) {
          query = query.eq("client_id", resolvedClientId);
        }

        const { data } = await query.maybeSingle();
        return (data as EmployeeAccessRow | null) ?? null;
      };

      let employeeRow = await fetchEmployeeAccess("user_id", userId);

      if (!employeeRow && profile?.employee_id) {
        employeeRow = await fetchEmployeeAccess("emp_id", profile.employee_id);
      }

      if (!employeeRow && session.user.email) {
        employeeRow = await fetchEmployeeAccess("email", session.user.email.trim().toLowerCase());
      }

      if (employeeRow && !employeeRow.user_id) {
        supabase
          .from("employees")
          .update({ user_id: userId })
          .eq("id", employeeRow.id)
          .then(() => {});
      }

      const rawEmployeeFeatures = employeeRow?.enabled_features ?? null;
      // NULL = no override (inherit all client features). Empty array = explicit deny all.
      const employeeFeatures = Array.isArray(rawEmployeeFeatures) ? rawEmployeeFeatures : null;

      // Orphan = user has a client-scoped role (admin/hr/employee) but no
      // employees row. Such users can authenticate but most modules will not
      // resolve their identity (no avatar, no approver lists, no payroll, etc.).
      const isOrphan =
        role !== null &&
        role !== "super_admin" &&
        !employeeRow &&
        !!resolvedClientId;

      setState({
        session,
        user: session.user,
        profile,
        role,
        clientId: resolvedClientId,
        isSuperAdmin: role === "super_admin",
        features,
        enabledModules,
        enabledFeatures,
        employeeFeatures,
        roleFeatures,
        peopleFeatures,
        isOrphan,
        loading: false,
      });

      lastLoadAt = Date.now();

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

    // Refresh features when the tab regains focus, throttled to once per 2 min
    // to avoid hammering the DB every time the user switches tabs.
    const onFocus = () => {
      if (Date.now() - lastLoadAt < 2 * 60 * 1000) return;
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
    // Client-level gate
    if (state.enabledFeatures !== null && !state.enabledFeatures.includes(key)) return false;
    // Admin sees all client features
    if (state.role === "admin") return state.features.has(key);
    // Custom role (hr): role_features take priority. If user also has a per-employee
    // override, intersect with it (override can further restrict). If no role_features
    // are assigned at all, fall back to client default features so the user isn't locked out.
    if (state.role === "hr") {
      if (state.roleFeatures.size > 0) {
        if (!state.roleFeatures.has(key)) return false;
        if (state.employeeFeatures !== null && !state.employeeFeatures.includes(key)) return false;
        return true;
      }
      // No custom role assigned — behave like a standard staff member
      if (state.employeeFeatures !== null && !state.employeeFeatures.includes(key)) return false;
      return state.features.has(key);
    }
    // Employee — per-employee feature list
    if (state.role === "employee" && state.employeeFeatures !== null && !state.employeeFeatures.includes(key)) {
      return false;
    }
    return state.features.has(key);
  };

  const hasPeopleFeature = (key: string): boolean => {
    if (state.isSuperAdmin) return true;
    if (state.role === "admin") return true;
    return state.peopleFeatures.has(key);
  };

  return { ...state, hasFeature, hasPeopleFeature, signOut };
}
