/**
 * Frontend-side audit recorder. Previously inserted directly into the
 * Supabase `audit_logs` table. With the NestJS backend, audit logs are
 * written server-side by the AuditInterceptor on every mutation, so this
 * client-side hook is no longer needed.
 *
 * The exported functions are kept as no-ops so existing callers don't break.
 */

export interface AuditWritePayload {
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
}

export async function recordAudit(_payload: AuditWritePayload): Promise<void> {
  // server-side audit handles this now
}

export function buildEntityLabel(prefix: string, value: string): string {
  return `${prefix}: ${value}`;
}
