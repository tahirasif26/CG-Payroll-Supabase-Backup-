import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useRequestApproval } from "@/hooks/queries/useRequestWorkflow";
import type { RequestModule } from "@/lib/workflow";

/**
 * Resolves whether the current user is a *valid approver* on a specific
 * request — the strict authorization gate that prevents request creators
 * from seeing Approve/Reject buttons.
 *
 * Returns true if:
 *   - user is super admin OR client admin/HR, OR
 *   - user is currently a pending assignee on the workflow row
 *
 * Returns false for the request creator unless they also happen to be an
 * assigned approver (which can legitimately happen in edge cases).
 */
export function useCanActOnRequest(module: RequestModule, entityId: string | undefined) {
  const { isSuperAdmin, appRole, clientId } = useRole();
  const { data: emp } = useCurrentEmployee();
  const { data: req } = useRequestApproval(module, entityId);

  const isAdmin = isSuperAdmin || appRole === "admin" || appRole === "hr";
  if (!entityId) return { canAct: false, isCreator: false, request: null };
  if (!req) return { canAct: false, isCreator: false, request: null };

  const isCreator = !!emp?.id && req.requester_employee_id === emp.id;
  const isAssignee = !!emp?.id && (req.assignments ?? []).some(
    (a: any) => a.employee_id === emp.id && a.status === "pending"
  );

  // Admins/HR can always act — but if they ARE the creator, hide actions to
  // enforce separation of duties (matches user requirement).
  const canAct = !isCreator && (isAdmin || isAssignee) && req.status === "pending"
    && !!clientId && req.client_id === clientId;

  return { canAct, isCreator, isAssignee, request: req };
}
