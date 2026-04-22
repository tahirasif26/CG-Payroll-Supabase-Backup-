// Thin wrapper around the `create_notification` / `notify_client_admins` RPCs.
// Use these from any flow that needs to push an in-app bell notification.
//
// Failures are swallowed — notifications must NEVER break the underlying flow.
import { supabase } from "@/integrations/supabase/client";

export type NotifyCategory =
  | "leave"
  | "expense"
  | "advance"
  | "loan"
  | "asset"
  | "payroll"
  | "policy"
  | "document"
  | "probation"
  | "general";

export type NotifySeverity = "info" | "success" | "warning" | "error";

export interface NotifyArgs {
  title: string;
  body?: string;
  category?: NotifyCategory;
  severity?: NotifySeverity;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  clientId?: string | null;
}

export async function notifyUser(recipientUserId: string, args: NotifyArgs) {
  if (!recipientUserId) return;
  try {
    await (supabase as any).rpc("create_notification", {
      _recipient_user_id: recipientUserId,
      _title: args.title,
      _body: args.body ?? null,
      _category: args.category ?? "general",
      _severity: args.severity ?? "info",
      _entity_type: args.entityType ?? null,
      _entity_id: args.entityId ?? null,
      _action_url: args.actionUrl ?? null,
      _client_id: args.clientId ?? null,
    });
  } catch (e) {
    console.warn("[notify] failed:", e);
  }
}

export async function notifyClientAdmins(clientId: string | null | undefined, args: NotifyArgs) {
  if (!clientId) return;
  try {
    await (supabase as any).rpc("notify_client_admins", {
      _client_id: clientId,
      _title: args.title,
      _body: args.body ?? null,
      _category: args.category ?? "general",
      _severity: args.severity ?? "info",
      _entity_type: args.entityType ?? null,
      _entity_id: args.entityId ?? null,
      _action_url: args.actionUrl ?? null,
    });
  } catch (e) {
    console.warn("[notify admins] failed:", e);
  }
}

// Look up the user_id for an employee row id (so admins can notify employees).
export async function getEmployeeUserId(employeeId: string): Promise<string | null> {
  if (!employeeId) return null;
  const { data, error } = await (supabase as any)
    .from("employees")
    .select("user_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (error || !data) return null;
  return data.user_id ?? null;
}
