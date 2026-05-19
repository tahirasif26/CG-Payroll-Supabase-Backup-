/**
 * Legacy approval-roles hooks. The new @/api/approvals engine has superseded
 * this; we keep type-stable stubs so old admin pages render without crashes.
 */
export interface ApprovalRoleRow {
  id: string;
  client_id: string;
  name: string;
  expense_approval_limit: number;
  can_approve_hr: boolean;
  can_approve_payroll: boolean;
}
export interface ApprovalAssignmentRow {
  id: string;
  client_id: string;
  user_id: string;
  role_id: string;
}

const noopMutation = {
  mutate: () => console.warn("[useApprovals] legacy approval-roles not on NestJS — use @/api/approvals"),
  mutateAsync: async () => undefined,
  isPending: false,
};

export function useApprovalRoles() { return { data: [] as ApprovalRoleRow[], isLoading: false }; }
export function useUpsertApprovalRole() { return noopMutation; }
export function useDeleteApprovalRole() { return noopMutation; }
export function useApprovalAssignments() { return { data: [] as ApprovalAssignmentRow[], isLoading: false }; }
export function useAssignApprovalRole() { return noopMutation; }
export function useUnassignApprovalRole() { return noopMutation; }

export function buildPermissionChecker(_roles: ApprovalRoleRow[], _assignments: ApprovalAssignmentRow[]) {
  return {
    canApproveHR: () => false,
    canApprovePayroll: () => false,
    expenseLimit: () => 0,
  };
}
