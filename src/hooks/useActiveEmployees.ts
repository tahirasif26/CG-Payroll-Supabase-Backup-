import { useQuery } from "@tanstack/react-query";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useSeparations } from "@/contexts/SeparationContext";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns only active (non-separated) AND verified employees.
 * An employee is "verified" once they have logged in at least once
 * (profiles.last_login_at IS NOT NULL). Until then they remain
 * visible in the directory with a "Pending" badge but are excluded
 * from payroll, leave, performance, asset, etc. workflows.
 */
export function useActiveEmployees() {
  const { employees } = useEmployees();
  const { separations } = useSeparations();
  const { clientId } = useRole();

  const { data: verifiedEmpIds } = useQuery({
    queryKey: ["verified-emp-ids", clientId ?? "none"],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("emp_id, is_verified")
        .eq("client_id", clientId!)
        .eq("is_verified", true);
      if (error) throw error;
      return new Set((data ?? []).map((e: any) => e.emp_id).filter(Boolean));
    },
  });

  const separatedIds = new Set(
    separations.filter((s) => s.status === "completed").map((s) => s.employeeId)
  );
  const verified = verifiedEmpIds ?? new Set<string>();

  return employees.filter(
    (e) => !separatedIds.has(e.id) && verified.has(e.empId)
  );
}
