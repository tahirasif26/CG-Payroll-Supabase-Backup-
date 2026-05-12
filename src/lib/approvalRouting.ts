// Approval routing helper.
// Resolves the approval group for a request via DB policy (Step 9 schema),
// then notifies all active approvers (with delegation resolution).
// Falls back to notifying all client admins if no policy matches.
import { supabase } from "@/integrations/supabase/client";
import { notifyUser, notifyClientAdmins, type NotifyCategory, type NotifySeverity } from "@/lib/notify";

export interface RouteApprovalArgs {
  clientId: string | null | undefined;
  category: string;          // policy category, e.g. "expenses_travel", "leave", "loans"
  value: number;             // halalas (money) or days (leave)
  notification: {
    title: string;
    body?: string;
    category?: NotifyCategory;
    severity?: NotifySeverity;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  };
}

export interface RouteApprovalResult {
  routedTo: "group" | "admins" | "none";
  groupId: string | null;
  approverCount: number;
}

export async function routeApprovalRequest(args: RouteApprovalArgs): Promise<RouteApprovalResult> {
  const { clientId, category, value, notification } = args;
  if (!clientId) return { routedTo: "none", groupId: null, approverCount: 0 };

  let groupId: string | null = null;
  try {
    const { data, error } = await (supabase as any).rpc("resolve_approval_group", {
      _client_id: clientId,
      _category: category,
      _value: value,
    });
    if (!error) groupId = (data as string | null) ?? null;
  } catch (e) {
    console.warn("[approval routing] resolve_approval_group failed:", e);
  }

  // Fallback: no matching policy → notify all client admins.
  if (!groupId) {
    await notifyClientAdmins(clientId, { ...notification, clientId });
    return { routedTo: "admins", groupId: null, approverCount: 0 };
  }

  // Get active approvers (delegation-aware).
  let approverEmpIds: string[] = [];
  try {
    const { data, error } = await (supabase as any).rpc("get_active_approvers", {
      _group_id: groupId,
    });
    if (!error && Array.isArray(data)) {
      approverEmpIds = data.map((r: any) => r.employee_id).filter(Boolean);
    }
  } catch (e) {
    console.warn("[approval routing] get_active_approvers failed:", e);
  }

  if (approverEmpIds.length === 0) {
    await notifyClientAdmins(clientId, { ...notification, clientId });
    return { routedTo: "admins", groupId, approverCount: 0 };
  }

  // Resolve user_ids for those employees.
  const { data: empRows } = await (supabase as any)
    .from("employees")
    .select("id, user_id")
    .in("id", approverEmpIds);

  const userIds = (empRows ?? [])
    .map((r: any) => r.user_id)
    .filter((u: string | null): u is string => !!u);

  await Promise.all(
    userIds.map((uid: string) => notifyUser(uid, { ...notification, clientId }))
  );

  return { routedTo: "group", groupId, approverCount: userIds.length };
}
