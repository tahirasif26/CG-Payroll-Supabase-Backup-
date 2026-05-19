import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  /** Filter by read state. Omit for all. */
  state: z.enum(['unread', 'read']).optional(),
  category: z.string().trim().optional(),
  severity: z.enum(['info', 'warning', 'urgent']).optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});
export type MarkReadDto = z.infer<typeof markReadSchema>;

/**
 * Internal-use DTO. Notifications are created by other modules (approvals,
 * payroll, reminders) — never directly by an end user — so this schema is
 * not exposed on the public REST API. Other backend modules import it.
 */
export const createNotificationSchema = z.object({
  clientId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().min(1).max(60),
  link: z.string().trim().max(500).optional().nullable(),
  severity: z.enum(['info', 'warning', 'urgent']).default('info'),
  entityType: z.string().trim().max(60).optional().nullable(),
  entityId: z.string().trim().max(80).optional().nullable(),
  actorUserId: z.string().uuid().optional().nullable(),
});
export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
