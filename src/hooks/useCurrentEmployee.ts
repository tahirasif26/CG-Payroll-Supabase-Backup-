import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

/**
 * Resolves the currently-logged-in user's `employees` row id (and basic info).
 * Used to auto-select "Self" in claim/request forms instead of showing a picker
 * to non-admin users.
 */
export function useCurrentEmployee() {
  const { user } = useRole();
  return useQuery({
    queryKey: ["current_employee", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, emp_id, first_name, last_name, status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
