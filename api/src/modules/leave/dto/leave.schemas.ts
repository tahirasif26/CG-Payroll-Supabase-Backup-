import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected ISO date');
const isoDateOpt = isoDate.optional().nullable();
const decimalStr = z.union([z.number(), z.string()]).transform((v) => String(v));

// ─── Leave types ─────────────────────────────────────────────────────────────

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40).toUpperCase(),
  daysPerYear: decimalStr.default('0'),
  accrualType: z.enum(['none', 'monthly', 'yearly']).default('yearly'),
  maxCarryforward: decimalStr.default('0'),
  requiresApproval: z.boolean().default(true),
  genderSpecific: z.enum(['male', 'female']).optional().nullable(),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type CreateLeaveTypeDto = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();
export type UpdateLeaveTypeDto = z.infer<typeof updateLeaveTypeSchema>;

// ─── Leave balances ──────────────────────────────────────────────────────────

export const listBalancesQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2200).optional(),
});
export type ListBalancesQuery = z.infer<typeof listBalancesQuerySchema>;

export const upsertBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2200),
  allocated: decimalStr.optional(),
  used: decimalStr.optional(),
  carriedForward: decimalStr.optional(),
});
export type UpsertBalanceDto = z.infer<typeof upsertBalanceSchema>;

// ─── Leave requests ──────────────────────────────────────────────────────────

export const listRequestsQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  leaveTypeId: z.string().uuid().optional(),
  /** "mine" — restrict to current user's employee record. */
  scope: z.enum(['mine', 'all']).optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

export const createLeaveRequestSchema = z.object({
  /** Admin/HR may submit on behalf of another employee. Defaults to caller. */
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid(),
  startDate: isoDate,
  endDate: isoDate,
  days: decimalStr,
  reason: z.string().trim().max(500).optional(),
});
export type CreateLeaveRequestDto = z.infer<typeof createLeaveRequestSchema>;

export const decideLeaveRequestSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().trim().max(500).optional(),
});
export type DecideLeaveRequestDto = z.infer<typeof decideLeaveRequestSchema>;

// ─── Holidays ────────────────────────────────────────────────────────────────

export const createHolidaySchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: isoDate,
  isOptional: z.boolean().default(false),
  appliesToLocations: z.array(z.string().trim()).default([]),
});
export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = createHolidaySchema.partial();
export type UpdateHolidayDto = z.infer<typeof updateHolidaySchema>;

export const listHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  from: isoDateOpt,
  to: isoDateOpt,
});
export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>;
