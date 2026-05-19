import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

// ─── Groups ──────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  approvalType: z.enum(['any_one', 'all_must', 'majority']).default('any_one'),
  maxLimitMinor: bigintLike.optional().nullable(),
  escalateAfterDays: z.coerce.number().int().min(1).max(180).optional().nullable(),
  escalateToGroupId: z.string().uuid().optional().nullable(),
  memberEmployeeIds: z.array(z.string().uuid()).default([]),
});
export type CreateGroupDto = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = createGroupSchema.partial();
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;

// ─── Policies ────────────────────────────────────────────────────────────────

export const policyLevelSchema = z.object({
  levelOrder: z.coerce.number().int().min(1).max(20),
  groupId: z.string().uuid(),
  mode: z.enum(['sequential', 'parallel']).default('sequential'),
  slaHours: z.coerce.number().int().min(1).max(720).optional().nullable(),
});

export const createPolicySchema = z.object({
  module: z.enum(['leave', 'expense', 'advance', 'loan', 'asset', 'payroll']),
  category: z.string().trim().max(80).optional().nullable(),
  minValueMinor: bigintLike.default('0'),
  maxValueMinor: bigintLike.optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  levels: z.array(policyLevelSchema).default([]),
});
export type CreatePolicyDto = z.infer<typeof createPolicySchema>;

export const updatePolicySchema = createPolicySchema.partial();
export type UpdatePolicyDto = z.infer<typeof updatePolicySchema>;

// ─── Delegations ─────────────────────────────────────────────────────────────

export const createDelegationSchema = z.object({
  fromEmployeeId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  startDate: isoDate,
  endDate: isoDate,
  fallbackEmployeeId: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});
export type CreateDelegationDto = z.infer<typeof createDelegationSchema>;

// ─── Requests ────────────────────────────────────────────────────────────────

export const listRequestApprovalsQuerySchema = paginationQuerySchema.extend({
  module: z.enum(['leave', 'expense', 'advance', 'loan', 'asset', 'payroll']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  /** "mine" → requests submitted by caller. "pending" → requests where caller has a pending assignment. */
  scope: z.enum(['mine', 'pending', 'all']).optional(),
});
export type ListRequestApprovalsQuery = z.infer<typeof listRequestApprovalsQuerySchema>;

export const decideRequestSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(1000).optional(),
});
export type DecideRequestDto = z.infer<typeof decideRequestSchema>;
