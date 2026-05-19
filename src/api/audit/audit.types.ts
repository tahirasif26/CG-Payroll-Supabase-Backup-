import type { PaginationQuery } from "../types";

export interface AuditLogEntry {
  id: string;
  clientId: string | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ListAuditQuery extends PaginationQuery {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  /** ISO date string. Inclusive lower bound on createdAt. */
  from?: string;
  /** ISO date string. Inclusive upper bound on createdAt. */
  to?: string;
}
