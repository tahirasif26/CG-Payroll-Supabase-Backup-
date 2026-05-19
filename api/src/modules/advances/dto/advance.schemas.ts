import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const bigintLike = z.union([z.string(), z.number()]).transform((v) => BigInt(v));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);
const isoDateOpt = isoDate.optional().nullable();

export const listAdvancesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'settled', 'cancelled']).optional(),
  employeeId: z.string().uuid().optional(),
  scope: z.enum(['mine', 'all']).optional(),
});
export type ListAdvancesQuery = z.infer<typeof listAdvancesQuerySchema>;

export const createAdvanceSchema = z.object({
  employeeId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  purpose: z.string().trim().max(500).optional().nullable(),
  amount: bigintLike,
  currency: z.string().trim().min(3).max(3).toUpperCase().default('AED'),
  expectedSpendDate: isoDateOpt,
  settlementDueDate: isoDateOpt,
  notes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['draft', 'submitted']).default('draft'),
});
export type CreateAdvanceDto = z.infer<typeof createAdvanceSchema>;

export const updateAdvanceSchema = createAdvanceSchema.partial().omit({ employeeId: true });
export type UpdateAdvanceDto = z.infer<typeof updateAdvanceSchema>;

export const decideAdvanceSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().trim().max(500).optional(),
});
export type DecideAdvanceDto = z.infer<typeof decideAdvanceSchema>;

export const settleAdvanceSchema = z.object({
  amountUsed: bigintLike.optional(),
});
export type SettleAdvanceDto = z.infer<typeof settleAdvanceSchema>;
