/**
 * Client-side request workflow helper. Superseded by the NestJS approvals
 * engine. The new flow:
 *   - Domain modules call `approvals.submitForApproval(...)` from their
 *     submit endpoints (leave, expense, advance, loan, payroll).
 *   - Approvers act via `/approval-requests/:id/decision`.
 *   - The engine advances through levels automatically.
 */

export interface StartWorkflowInput {
  module: string;
  entityId: string;
  value: number;
  requesterEmployeeId: string;
}

export async function startWorkflow(_input: StartWorkflowInput): Promise<void> {
  console.warn(
    "[lib/workflow] superseded by NestJS approvals engine. Submission endpoints route automatically.",
  );
}

export async function actOnRequest(
  _requestApprovalId: string,
  _decision: "approve" | "reject",
  _comment?: string,
): Promise<void> {
  console.warn(
    "[lib/workflow] use `useDecideApprovalRequest` from @/api instead.",
  );
}

export async function markRequestPaid(_module: string, _entityId: string): Promise<void> {
  console.warn(
    "[lib/workflow] mark-paid lives in domain endpoints now (e.g. /expenses/:id/mark-paid).",
  );
}
