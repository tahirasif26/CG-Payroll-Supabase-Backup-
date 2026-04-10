import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "hr" | "employee";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    role: "employee",
    loading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Fetch profile and role with setTimeout to avoid deadlock
          setTimeout(async () => {
            const [profileRes, roleRes] = await Promise.all([
              supabase.from("profiles").select("*").eq("id", session.user.id).single(),
              supabase.rpc("get_user_role", { _user_id: session.user.id }),
            ]);

            setState({
              session,
              user: session.user,
              profile: profileRes.data as Profile | null,
              role: (roleRes.data as AppRole) || "employee",
              loading: false,
            });
          }, 0);
        } else {
          setState({
            session: null,
            user: null,
            profile: null,
            role: "employee",
            loading: false,
          });
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState(prev => ({ ...prev, loading: false }));
      }
      // onAuthStateChange will handle the session if it exists
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
