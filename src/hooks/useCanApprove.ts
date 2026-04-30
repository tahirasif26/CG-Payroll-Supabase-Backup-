import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useApprovalGroups } from "@/hooks/queries/useApprovalMatrix";

/**
 * Returns true if the current user can approve items in the given category.
 * Admin/super_admin always can. Otherwise, the user must be a member of any
 * approval group configured for the tenant.
 */
export function useCanApprove(
  _category: "expenses" | "loans" | "payroll" | "leave" | "advances"
) {
  const { appRole, clientId, isSuperAdmin } = useRole();
  const { data: employee } = useCurrentEmployee();
  const { data: groups = [] } = useApprovalGroups(clientId);

  if (isSuperAdmin) return true;
  if (appRole === "admin") return true;
  if (!employee?.id) return false;

  return groups.some((g) => g.member_ids.includes(employee.id));
}
