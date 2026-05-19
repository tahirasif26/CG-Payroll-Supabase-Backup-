import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

export const listAuditQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'ISO date or datetime expected')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'ISO date or datetime expected')
    .optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

/**
 * Internal-use DTO consumed by the AuditInterceptor (not exposed via REST).
 * Other modules don't need to call this directly — the interceptor records
 * controller-level CRUD automatically; explicit logs for domain events
 * (login, approval decision, payroll lock, etc.) call AuditService.record()
 * directly.
 */
export const recordAuditSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  userEmail: z.string().email().nullable().optional(),
  userRole: z.string().trim().max(40).nullable().optional(),
  action: z.string().trim().min(1).max(80),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().trim().max(120).nullable().optional(),
  entityLabel: z.string().trim().max(200).nullable().optional(),
  beforeValue: z.unknown().nullable().optional(),
  afterValue: z.unknown().nullable().optional(),
  ipAddress: z.string().trim().max(80).nullable().optional(),
  userAgent: z.string().trim().max(500).nullable().optional(),
});
export type RecordAuditDto = z.infer<typeof recordAuditSchema>;
