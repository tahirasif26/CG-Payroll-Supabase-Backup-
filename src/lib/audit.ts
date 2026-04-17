import { supabase } from "@/integrations/supabase/client";

export interface AuditParams {
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  /** Optional override; usually inferred from the user's primary client. */
  clientId?: string | null;
}

/**
 * Log an audit entry from the frontend.
 *
 * ⚠️ For sensitive actions (payroll approval, role changes, salary edits),
 * prefer logging from inside an edge function using the service role —
 * frontend logs are best-effort and can be skipped by malicious clients.
 *
 * Returns true on success, false on failure. Never throws.
 */
export async function logAudit(params: AuditParams): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("audit_logs").insert({
      client_id: params.clientId ?? null,
      user_id: user.id,
      user_email: user.email ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_label: params.entityLabel ?? null,
      before_value: (params.beforeValue ?? null) as never,
      after_value: (params.afterValue ?? null) as never,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      console.warn("[audit] insert failed", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[audit] unexpected error", err);
    return false;
  }
}
