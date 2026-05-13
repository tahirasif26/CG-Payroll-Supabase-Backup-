// Unified Request & Approval Workflow client helpers.
// Wraps the SECURITY DEFINER RPCs (start_request_workflow / act_on_request /
// mark_request_paid) and the request_approvals reads.
import { supabase } from "@/integrations/supabase/client";
import { notifyUser, notifyClientAdmins, type NotifyCategory, type NotifySeverity } from "@/lib/notify";

export type RequestModule = "expense" | "advance" | "loan" | "leave" | "asset";
export type RequestStatus = "pending" | "approved" | "rejected" | "paid" | "unpaid" | "delivered";
export type WorkflowAction = "approved" | "rejected" | "delivered";

export interface StartWorkflowArgs {
  module: RequestModule;
  entityId: string;
  clientId: string;
  requesterEmployeeId: string;
  value?: number;        // halalas for money, days for leave
  valueUnit?: "halalas" | "days";
  category?: string;     // optional override (defaults to module + 's', e.g. 'expenses')
  notification?: {
    title: string;
    body?: string;
    category?: NotifyCategory;
    severity?: NotifySeverity;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  };
}

export async function startWorkflow(args: StartWorkflowArgs): Promise<string | null> {
  const { module, entityId, clientId, requesterEmployeeId, value = 0, valueUnit = "halalas", category, notification } = args;

  const { data, error } = await (supabase as any).rpc("start_request_workflow", {
    _module: module,
    _entity_id: entityId,
    _client_id: clientId,
    _requester_employee_id: requesterEmployeeId,
    _value: value,
    _value_unit: valueUnit,
    _category: category ?? null,
  });
  if (error) {
    console.warn("[workflow] start_request_workflow failed:", error);
    return null;
  }
  const requestId = data as string | null;

  // Notify current pending assignees, falling back to client admins.
  if (requestId && notification) {
    try {
      const { data: assignments } = await (supabase as any)
        .from("request_assignments")
        .select("employee_id")
        .eq("request_approval_id", requestId)
        .eq("status", "pending");

      const empIds = (assignments ?? []).map((r: any) => r.employee_id).filter(Boolean);
      if (empIds.length === 0) {
        await notifyClientAdmins(clientId, { ...notification, clientId });
      } else {
        const { data: empRows } = await (supabase as any)
          .from("employees").select("user_id").in("id", empIds);
        const userIds = (empRows ?? []).map((r: any) => r.user_id).filter(Boolean) as string[];
        await Promise.all(userIds.map((u) => notifyUser(u, { ...notification, clientId })));
      }
    } catch (e) {
      console.warn("[workflow] notification dispatch failed:", e);
    }
  }
  return requestId;
}

export async function actOnRequest(requestApprovalId: string, action: WorkflowAction, comment?: string) {
  const { data, error } = await (supabase as any).rpc("act_on_request", {
    _request_approval_id: requestApprovalId,
    _action: action,
    _comment: comment ?? null,
  });
  if (error) throw error;
  return data;
}

export async function markRequestPaid(requestApprovalId: string, payrollRunId?: string | null, paid = true) {
  const { error } = await (supabase as any).rpc("mark_request_paid", {
    _request_approval_id: requestApprovalId,
    _payroll_run_id: payrollRunId ?? null,
    _paid: paid,
  });
  if (error) throw error;
}
