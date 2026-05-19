/** Shim — returns currently active employees from the new @/api hook,
 * filtered to status=active. The legacy `is_verified` filter is dropped
 * (will return when that flag is ported on NestJS). */
import { useEmployees, type EmployeeDirectoryItem } from "@/api";

export function useActiveEmployees(): EmployeeDirectoryItem[] {
  const { data } = useEmployees({ status: "active", pageSize: 500 });
  return data?.data ?? [];
}
