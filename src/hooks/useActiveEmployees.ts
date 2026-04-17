import { useEmployees } from "@/contexts/EmployeeContext";
import { useSeparations } from "@/contexts/SeparationContext";

/**
 * Returns only active (non-separated) employees from the live tenant dataset.
 */
export function useActiveEmployees() {
  const { employees } = useEmployees();
  const { separations } = useSeparations();
  const separatedIds = new Set(
    separations.filter((s) => s.status === "approved").map((s) => s.employeeId)
  );
  return employees.filter((e) => !separatedIds.has(e.id));
}
