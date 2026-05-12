import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useApprovalGroups } from "@/hooks/queries/useApprovalMatrix";

/**
 * Returns true if the current user can approve items in the given category.
 * Admin/super_admin always can. Otherwise, the user must be a member of any
 * approval group configured for the tenant.
 */
const FEATURE_BY_CATEGORY: Record<string, string | undefined> = {
  expenses: "expenses.approve",
  loans: "loans.approve",
  leave: "leave.approve",
  advances: "advances.approve",
};

export function useCanApprove(
  category: "expenses" | "loans" | "leave" | "advances"
) {
  const { appRole, clientId, isSuperAdmin, hasFeature } = useRole();
  const { data: employee } = useCurrentEmployee();
  const { data: groups = [] } = useApprovalGroups(clientId);

  if (isSuperAdmin) return true;
  if (appRole === "admin") return true;

  // Custom role grant: if the user's role has the corresponding approval
  // feature enabled, allow it without requiring approval-group membership.
  const featureKey = FEATURE_BY_CATEGORY[category];
  if (featureKey && hasFeature(featureKey)) return true;

  if (!employee?.id) return false;
  return groups.some((g) => g.member_ids.includes(employee.id));
}
