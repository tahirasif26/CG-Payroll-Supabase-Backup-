import { apiGetWithMeta } from "../client";
import type { ApiResponse } from "../types";
import type { AuditLogEntry, ListAuditQuery } from "./audit.types";

export const auditApi = {
  list(query: ListAuditQuery = {}): Promise<ApiResponse<AuditLogEntry[]>> {
    return apiGetWithMeta<AuditLogEntry[]>(
      "/audit-logs",
      query as Record<string, unknown>,
    );
  },
};
