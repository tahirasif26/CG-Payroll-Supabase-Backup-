import { employees } from "@/data/mockData";
import { useSeparations } from "@/contexts/SeparationContext";

/**
 * Returns only active (non-separated) employees.
 * Filters out any employee who has an approved separation.
 */
export function useActiveEmployees() {
  const { separations } = useSeparations();
  const separatedIds = new Set(
    separations
      .filter(s => s.status === "approved")
      .map(s => s.employeeId)
  );
  return employees.filter(e => !separatedIds.has(e.id));
}
