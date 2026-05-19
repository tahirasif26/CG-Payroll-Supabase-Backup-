/**
 * Client-side approval routing helper. Superseded by the NestJS approvals
 * engine which resolves policies + groups + delegations server-side.
 * Calling code can now use:
 *   - `useApprovalPolicies` / `useApprovalGroups` from @/api to introspect
 *   - The submit flows of leave/expense/advance/loan/payroll auto-route
 */

export interface ApprovalRoutingResult {
  groupId: string | null;
  approvers: string[];
}

export async function resolveApprovalRouting(
  _module: string,
  _value: number,
): Promise<ApprovalRoutingResult> {
  console.warn(
    "[lib/approvalRouting] superseded by NestJS approvals engine. " +
      "Use @/api/approvals hooks instead.",
  );
  return { groupId: null, approvers: [] };
}
